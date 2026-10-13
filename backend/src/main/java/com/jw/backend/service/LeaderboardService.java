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
    // Never wait for rate-limit budget on a page view: a lookup either goes out now or is left for later
    static final long NAME_RESOLUTION_MAX_WAIT_MS = 0;
    private static final String UNKNOWN = "Unknown";

    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;
    private final LeaderboardPrefetchService prefetchService;
    // The rate limiter enforces Riot's per-second limit; a few threads are enough to resolve a page
    private final Executor nameResolver = Executors.newFixedThreadPool(3);
    // How long a page view may spend on Riot lookups for rows the caches couldn't fill
    private long lookupTimeoutMs = 3000;

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

    // Visible for testing
    void setLookupTimeoutMs(long lookupTimeoutMs) {
        this.lookupTimeoutMs = lookupTimeoutMs;
    }

    public record LeaderboardPage(List<LeaderboardEntryDto> entries, int totalEntries) {}

    /**
     * Build one page of a tier leaderboard.
     *
     * <p>The League-v4 tier endpoint returns every player in the tier in a single (Redis-cached)
     * call, so it is the source of truth for ordering, LP, and the total count. Riot no longer
     * includes player names there, so names and profile icons are filled in for the requested page
     * in two passes:</p>
     * <ol>
     *   <li>From the prefetch and the 24h caches. Instant and free, so anything already known is
     *       always shown.</li>
     *   <li>For rows still missing something, best-effort Riot calls within a fixed time budget.
     *       They never wait for rate-limit budget, and lookups that miss the deadline are dropped,
     *       so a busy moment can't pile up work behind later page views.</li>
     * </ol>
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

        // Pass 1: prefetch + caches only
        Map<String, LeaderboardPrefetchService.ResolvedEntry> prefetched = prefetchedByPuuid(tier, queue, region);
        List<Row> rows = new ArrayList<>(pageEntries.size());
        for (RawEntry raw : pageEntries) {
            rows.add(fromCaches(raw, region, prefetched));
        }

        // Pass 2: best-effort Riot lookups for rows still missing a name or icon
        long deadline = System.currentTimeMillis() + lookupTimeoutMs;
        Map<Integer, CompletableFuture<Row>> lookups = new HashMap<>();
        for (int i = 0; i < rows.size(); i++) {
            Row row = rows.get(i);
            if (!row.isComplete() && !row.raw().puuid().isEmpty()) {
                lookups.put(i, CompletableFuture.supplyAsync(() -> fillFromRiot(row, region, deadline), nameResolver));
            }
        }
        for (Map.Entry<Integer, CompletableFuture<Row>> lookup : lookups.entrySet()) {
            long remaining = Math.max(0, deadline - System.currentTimeMillis());
            try {
                rows.set(lookup.getKey(), lookup.getValue().get(remaining, TimeUnit.MILLISECONDS));
            } catch (Exception e) {
                // Missed the deadline or failed: keep what the caches gave us
                lookup.getValue().cancel(false);
            }
        }

        List<LeaderboardEntryDto> entries = rows.stream()
                .map(row -> buildDto(row.raw(), leagueTier,
                        row.name() != null ? row.name() : fallbackName(row.raw()), row.icon()))
                .toList();

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

    /** Name and icon from the prefetch or the caches. Never calls Riot. */
    private Row fromCaches(RawEntry raw, RiotRegion region,
                           Map<String, LeaderboardPrefetchService.ResolvedEntry> prefetched) {
        if (raw.puuid().isEmpty()) return new Row(raw, null, 0);
        LeaderboardPrefetchService.ResolvedEntry pre = prefetched.get(raw.puuid());

        String name = pre != null && !UNKNOWN.equals(pre.summonerName()) ? pre.summonerName() : null;
        if (name == null) {
            name = parseRiotId(riotApiService.peekAccountByPuuid(raw.puuid(), region));
        }
        int icon = pre != null ? pre.profileIconId() : 0;
        if (icon <= 0) {
            Integer cachedIcon = riotApiService.peekProfileIconId(raw.puuid(), region);
            icon = cachedIcon == null ? 0 : cachedIcon;
        }
        return new Row(raw, name, icon);
    }

    /** Fill whatever the caches couldn't, with immediate (non-waiting) Riot calls before the deadline. */
    private Row fillFromRiot(Row row, RiotRegion region, long deadline) {
        String puuid = row.raw().puuid();
        String name = row.name();
        int icon = row.icon();
        try {
            if (name == null && System.currentTimeMillis() < deadline) {
                name = parseRiotId(riotApiService.tryGetAccountByPuuid(
                        puuid, region, NAME_RESOLUTION_RESERVE_PERMITS, NAME_RESOLUTION_MAX_WAIT_MS));
            }
            if (icon <= 0 && System.currentTimeMillis() < deadline) {
                Integer iconId = riotApiService.tryGetProfileIconId(
                        puuid, region, NAME_RESOLUTION_RESERVE_PERMITS, NAME_RESOLUTION_MAX_WAIT_MS);
                icon = iconId == null ? 0 : iconId;
            }
        } catch (Exception e) {
            log.debug("Leaderboard lookup failed for puuid {}: {}", puuid, e.getMessage());
        }
        return new Row(row.raw(), name, icon);
    }

    /** "gameName#tagLine" from an Account-v1 response, or null if it's missing or unreadable. */
    private String parseRiotId(String accountJson) {
        if (accountJson == null) return null;
        try {
            JsonNode account = objectMapper.readTree(accountJson);
            String gameName = account.path("gameName").asText("");
            String tagLine = account.path("tagLine").asText("");
            if (gameName.isEmpty()) return null;
            return tagLine.isEmpty() ? gameName : gameName + "#" + tagLine;
        } catch (Exception e) {
            return null;
        }
    }

    private LeaderboardEntryDto buildDto(RawEntry raw, String leagueTier, String name, int profileIconId) {
        int total = raw.wins() + raw.losses();
        double winRate = total > 0 ? Math.round((double) raw.wins() / total * 1000.0) / 10.0 : 0.0;
        return new LeaderboardEntryDto(name, raw.puuid(), leagueTier, raw.rank(), raw.lp(),
                raw.wins(), raw.losses(), winRate, profileIconId);
    }

    private static String fallbackName(RawEntry raw) {
        return raw.fallbackName().isEmpty() ? UNKNOWN : raw.fallbackName();
    }

    private record RawEntry(String puuid, String fallbackName, String rank, int lp, int wins, int losses) {}

    /** A page row while its name (null = unknown) and icon (0 = unknown) are being filled in. */
    private record Row(RawEntry raw, String name, int icon) {
        boolean isComplete() { return name != null && icon > 0; }
    }
}
