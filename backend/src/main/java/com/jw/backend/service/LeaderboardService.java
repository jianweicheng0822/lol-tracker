/**
 * @file LeaderboardService.java
 * @description Business logic for parsing and sorting League-v4 leaderboard data.
 * @module backend.service
 */
package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.LeaderboardEntryDto;
import com.jw.backend.region.RiotRegion;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class LeaderboardService {

    private static final Logger log = LoggerFactory.getLogger(LeaderboardService.class);

    /**
     * Regions that have a leaderboard. Kept to the three major regions so the Riot rate limit
     * (dev key) can keep their names and icons fully resolved. Player search is unaffected.
     */
    public static final List<RiotRegion> LEADERBOARD_REGIONS = List.of(RiotRegion.NA, RiotRegion.EUW, RiotRegion.KR);

    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    // Pages with unresolved names are cached briefly so later views pick up newly resolved names
    private static final long INCOMPLETE_CACHE_TTL_MS = 30 * 1000;
    // Rate-limit permits left untouched for interactive lookups (player search) while resolving names
    static final int NAME_RESOLUTION_RESERVE_PERMITS = 30;
    // Someone is waiting on the page, so only ride out the per-second limit, not the 2-minute one
    static final long NAME_RESOLUTION_MAX_WAIT_MS = 1_000;
    private static final long NAME_RESOLUTION_TIMEOUT_MS = 4000;
    private static final String UNKNOWN = "Unknown";

    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;
    private final LeaderboardPrefetchService prefetchService;
    // The rate limiter enforces Riot's per-second limit; a few threads are enough to resolve a page
    private final Executor nameResolver = Executors.newFixedThreadPool(3);

    private record CachedPage(LeaderboardPage page, long timestamp, long ttlMs) {
        boolean isExpired() { return System.currentTimeMillis() - timestamp > ttlMs; }
    }

    private final ConcurrentHashMap<String, CachedPage> pageCache = new ConcurrentHashMap<>();

    public LeaderboardService(RiotApiService riotApiService, ObjectMapper objectMapper,
                              @Autowired(required = false) LeaderboardPrefetchService prefetchService) {
        this.riotApiService = riotApiService;
        this.objectMapper = objectMapper;
        this.prefetchService = prefetchService;
    }

    public record LeaderboardPage(List<LeaderboardEntryDto> entries, int totalEntries) {}

    /**
     * Build one page of a tier leaderboard.
     *
     * <p>The League-v4 tier endpoint returns every player in the tier in a single (Redis-cached)
     * call, so it is the source of truth for ordering, LP, and the total count. Riot no longer
     * includes player names there, so names and profile icons are resolved only for the requested
     * page: from the background prefetch when available, otherwise from the account cache or a
     * best-effort Riot call that leaves headroom in the rate limiter. Partial prefetch results can
     * therefore never truncate or empty the leaderboard.</p>
     */
    public LeaderboardPage getLeaderboard(String tier, String queue, RiotRegion region, int page, int size) {
        String cacheKey = tier + ":" + queue + ":" + region.name() + ":" + page + ":" + size;
        CachedPage cached = pageCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            log.debug("Leaderboard cache hit for {}", cacheKey);
            return cached.page();
        }
        // Evict expired entries lazily
        pageCache.entrySet().removeIf(e -> e.getValue().isExpired());

        String json = riotApiService.getLeagueByTier(tier, queue, region);
        String leagueTier;
        List<RawEntry> rawEntries = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(json);
            leagueTier = root.path("tier").asText(tier.toUpperCase());
            for (JsonNode e : root.path("entries")) {
                rawEntries.add(new RawEntry(
                        e.path("puuid").asText(""),
                        e.path("summonerName").asText(""),
                        e.path("rank").asText("I"),
                        e.path("leaguePoints").asInt(0),
                        e.path("wins").asInt(0),
                        e.path("losses").asInt(0)));
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse league JSON for " + tier, e);
        }

        rawEntries.sort(Comparator.comparingInt(RawEntry::lp).reversed());

        int totalEntries = rawEntries.size();
        int from = Math.min(page * size, totalEntries);
        int to = Math.min(from + size, totalEntries);
        List<RawEntry> pageEntries = rawEntries.subList(from, to);

        Map<String, LeaderboardPrefetchService.ResolvedEntry> prefetched = prefetchedByPuuid(tier, queue, region);
        List<CompletableFuture<LeaderboardEntryDto>> futures = pageEntries.stream()
                .map(raw -> CompletableFuture.supplyAsync(
                        () -> toDto(raw, leagueTier, region, prefetched), nameResolver))
                .toList();

        long deadline = System.currentTimeMillis() + NAME_RESOLUTION_TIMEOUT_MS;
        List<LeaderboardEntryDto> entries = new ArrayList<>(pageEntries.size());
        for (int i = 0; i < futures.size(); i++) {
            long remaining = Math.max(0, deadline - System.currentTimeMillis());
            try {
                entries.add(futures.get(i).get(remaining, TimeUnit.MILLISECONDS));
            } catch (Exception e) {
                // Timed out or failed: show the row without a resolved name rather than dropping it
                RawEntry raw = pageEntries.get(i);
                entries.add(buildDto(raw, leagueTier, fallbackName(raw), 0));
            }
        }

        LeaderboardPage result = new LeaderboardPage(entries, totalEntries);
        boolean complete = entries.stream().noneMatch(e ->
                UNKNOWN.equals(e.summonerName()) || (!e.puuid().isEmpty() && e.profileIconId() == 0));
        pageCache.put(cacheKey, new CachedPage(result, System.currentTimeMillis(),
                complete ? CACHE_TTL_MS : INCOMPLETE_CACHE_TTL_MS));
        return result;
    }

    private Map<String, LeaderboardPrefetchService.ResolvedEntry> prefetchedByPuuid(
            String tier, String queue, RiotRegion region) {
        Map<String, LeaderboardPrefetchService.ResolvedEntry> byPuuid = new HashMap<>();
        if (prefetchService == null) return byPuuid;
        prefetchService.getCached(tier, queue, region).ifPresent(list -> {
            for (LeaderboardPrefetchService.ResolvedEntry e : list) {
                if (e.puuid() != null && !e.puuid().isEmpty()) byPuuid.put(e.puuid(), e);
            }
        });
        return byPuuid;
    }

    private LeaderboardEntryDto toDto(RawEntry raw, String leagueTier, RiotRegion region,
                                      Map<String, LeaderboardPrefetchService.ResolvedEntry> prefetched) {
        LeaderboardPrefetchService.ResolvedEntry pre = prefetched.get(raw.puuid());
        String name = pre != null && !UNKNOWN.equals(pre.summonerName())
                ? pre.summonerName()
                : resolveName(raw, region);
        int icon = pre != null && pre.profileIconId() > 0
                ? pre.profileIconId()
                : resolveProfileIcon(raw.puuid(), region);
        return buildDto(raw, leagueTier, name, icon);
    }

    private LeaderboardEntryDto buildDto(RawEntry raw, String leagueTier, String name, int profileIconId) {
        int total = raw.wins() + raw.losses();
        double winRate = total > 0 ? Math.round((double) raw.wins() / total * 1000.0) / 10.0 : 0.0;
        return new LeaderboardEntryDto(name, raw.puuid(), leagueTier, raw.rank(), raw.lp(),
                raw.wins(), raw.losses(), winRate, profileIconId);
    }

    private String resolveName(RawEntry raw, RiotRegion region) {
        if (raw.puuid().isEmpty()) return fallbackName(raw);
        try {
            String accountJson = riotApiService.tryGetAccountByPuuid(
                    raw.puuid(), region, NAME_RESOLUTION_RESERVE_PERMITS, NAME_RESOLUTION_MAX_WAIT_MS);
            if (accountJson != null) {
                JsonNode account = objectMapper.readTree(accountJson);
                String gameName = account.path("gameName").asText("");
                String tagLine = account.path("tagLine").asText("");
                if (!gameName.isEmpty()) {
                    return tagLine.isEmpty() ? gameName : gameName + "#" + tagLine;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to resolve name for puuid {}: {}", raw.puuid(), e.getMessage());
        }
        return fallbackName(raw);
    }

    /** Icon from the 24h cache, or a budgeted Riot call; 0 (placeholder) if it can't be resolved now. */
    private int resolveProfileIcon(String puuid, RiotRegion region) {
        if (puuid.isEmpty()) return 0;
        Integer iconId = riotApiService.tryGetProfileIconId(
                puuid, region, NAME_RESOLUTION_RESERVE_PERMITS, NAME_RESOLUTION_MAX_WAIT_MS);
        return iconId == null ? 0 : iconId;
    }

    private static String fallbackName(RawEntry raw) {
        return raw.fallbackName().isEmpty() ? UNKNOWN : raw.fallbackName();
    }

    private record RawEntry(String puuid, String fallbackName, String rank, int lp, int wins, int losses) {}
}
