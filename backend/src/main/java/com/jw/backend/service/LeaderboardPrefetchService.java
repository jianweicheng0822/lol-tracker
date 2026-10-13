package com.jw.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.region.RiotRegion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@ConditionalOnProperty(name = "leaderboard.prefetch.enabled", havingValue = "true", matchIfMissing = true)
public class LeaderboardPrefetchService {

    private static final Logger log = LoggerFactory.getLogger(LeaderboardPrefetchService.class);
    // Only a name/icon lookup for the read path, so it can outlive a cycle or two
    private static final Duration CACHE_TTL = Duration.ofMinutes(60);
    private static final String[] TIERS = {"challenger", "grandmaster", "master"};
    // Flex leaderboards are resolved on demand only — Solo/Duo is what most people browse
    static final String QUEUE = "RANKED_SOLO_5x5";
    // Higher than the on-demand reserve, so people browsing the leaderboard win over the background job
    static final int PREFETCH_RESERVE_PERMITS = 50;
    // Background job, so it can wait for budget to free up instead of skipping players
    static final long PREFETCH_MAX_WAIT_MS = 60_000;

    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Value("${leaderboard.prefetch.max-master-entries:500}")
    private int maxMasterEntries;

    public LeaderboardPrefetchService(RiotApiService riotApiService,
                                       ObjectMapper objectMapper,
                                       StringRedisTemplate redisTemplate) {
        this.riotApiService = riotApiService;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
    }

    public record ResolvedEntry(
            String summonerName, String puuid, String tier, String rank,
            int leaguePoints, int wins, int losses, double winRate,
            int profileIconId
    ) {}

    @Scheduled(fixedDelayString = "${leaderboard.prefetch.interval-ms:900000}", initialDelay = 10_000)
    public void prefetchAll() {
        if (!isRedisAvailable()) {
            log.warn("Redis is unavailable, skipping prefetch cycle");
            return;
        }
        log.info("Starting leaderboard prefetch cycle");
        prefetchCycle();
        log.info("Leaderboard prefetch cycle complete");
    }

    /**
     * Refresh every Solo/Duo leaderboard, tier by tier (all regions' Challenger first) so the most
     * viewed pages fill in first. Names and icons come from 24h caches, so each cycle only spends
     * rate-limit permits on players that are new to the ladder or whose cache expired.
     */
    void prefetchCycle() {
        for (String tier : TIERS) {
            for (RiotRegion region : LeaderboardService.LEADERBOARD_REGIONS) {
                try {
                    prefetchOne(tier, QUEUE, region);
                } catch (Exception e) {
                    log.warn("Prefetch failed for {}:{}:{}: {}", tier, QUEUE, region, e.getMessage());
                }
            }
        }
    }

    private boolean isRedisAvailable() {
        try {
            String result = redisTemplate.getConnectionFactory().getConnection().ping();
            return "PONG".equals(result);
        } catch (Exception e) {
            return false;
        }
    }

    void prefetchOne(String tier, String queue, RiotRegion region) {
        String json = riotApiService.getLeagueByTier(tier, queue, region);
        try {
            JsonNode root = objectMapper.readTree(json);
            String leagueTier = root.path("tier").asText(tier.toUpperCase());

            List<RawEntry> rawEntries = new ArrayList<>();
            for (JsonNode e : root.path("entries")) {
                rawEntries.add(new RawEntry(
                        e.path("puuid").asText(""),
                        e.path("rank").asText("I"),
                        e.path("leaguePoints").asInt(0),
                        e.path("wins").asInt(0),
                        e.path("losses").asInt(0)));
            }

            rawEntries.sort(Comparator.comparingInt(RawEntry::lp).reversed());

            int limit = "master".equalsIgnoreCase(tier)
                    ? Math.min(rawEntries.size(), maxMasterEntries)
                    : rawEntries.size();

            List<ResolvedEntry> resolved = new ArrayList<>();
            int skipped = 0;
            for (int i = 0; i < limit; i++) {
                RawEntry raw = rawEntries.get(i);
                if (raw.puuid().isEmpty()) continue;

                // The rate limiter paces these calls (both Riot limits) and keeps our reserve free
                String name = resolveName(raw.puuid(), region);
                if (name == null) {
                    // No budget within the wait (or the lookup failed); a later cycle will pick it up.
                    // Keep going — the remaining players may still be served from cache for free.
                    skipped++;
                    continue;
                }
                Integer iconId = riotApiService.tryGetProfileIconId(
                        raw.puuid(), region, PREFETCH_RESERVE_PERMITS, PREFETCH_MAX_WAIT_MS);
                int total = raw.wins() + raw.losses();
                double winRate = total > 0 ? Math.round((double) raw.wins() / total * 1000.0) / 10.0 : 0.0;
                resolved.add(new ResolvedEntry(name, raw.puuid(), leagueTier, raw.rank(),
                        raw.lp(), raw.wins(), raw.losses(), winRate, iconId == null ? 0 : iconId));
            }

            String redisKey = "lb:prefetched:" + region.name() + ":" + tier + ":" + queue;
            redisTemplate.opsForValue().set(redisKey, objectMapper.writeValueAsString(resolved), CACHE_TTL);
            log.info("Prefetched {} of {} entries for {}:{}:{} ({} skipped, rate limit)",
                    resolved.size(), limit, tier, queue, region, skipped);
        } catch (Exception e) {
            log.warn("Failed to prefetch {}:{}:{}: {}", tier, queue, region, e.getMessage());
        }
    }

    /** Riot ID from the 24h account cache or a budgeted Riot call; null if it couldn't be resolved. */
    private String resolveName(String puuid, RiotRegion region) {
        try {
            String accountJson = riotApiService.tryGetAccountByPuuid(
                    puuid, region, PREFETCH_RESERVE_PERMITS, PREFETCH_MAX_WAIT_MS);
            if (accountJson == null) return null;
            JsonNode account = objectMapper.readTree(accountJson);
            String gameName = account.path("gameName").asText("");
            String tagLine = account.path("tagLine").asText("");
            if (!gameName.isEmpty()) {
                return tagLine.isEmpty() ? gameName : gameName + "#" + tagLine;
            }
        } catch (Exception e) {
            log.debug("Prefetch: failed to resolve name for puuid {}: {}", puuid, e.getMessage());
        }
        return null;
    }

    public Optional<List<ResolvedEntry>> getCached(String tier, String queue, RiotRegion region) {
        try {
            String redisKey = "lb:prefetched:" + region.name() + ":" + tier + ":" + queue;
            String json = redisTemplate.opsForValue().get(redisKey);
            if (json == null) {
                return Optional.empty();
            }
            List<ResolvedEntry> entries = objectMapper.readValue(json, new TypeReference<>() {});
            return Optional.of(entries);
        } catch (Exception e) {
            log.warn("Failed to read prefetched leaderboard from Redis: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private record RawEntry(String puuid, String rank, int lp, int wins, int losses) {}
}
