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
    private static final Duration CACHE_TTL = Duration.ofMinutes(20);
    private static final String[] TIERS = {"challenger", "grandmaster", "master"};
    private static final String[] QUEUES = {"RANKED_SOLO_5x5", "RANKED_FLEX_SR"};

    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final RiotRateLimiter riotRateLimiter;

    @Value("${leaderboard.prefetch.max-master-entries:500}")
    private int maxMasterEntries;

    public LeaderboardPrefetchService(RiotApiService riotApiService,
                                       ObjectMapper objectMapper,
                                       StringRedisTemplate redisTemplate,
                                       RiotRateLimiter riotRateLimiter) {
        this.riotApiService = riotApiService;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        this.riotRateLimiter = riotRateLimiter;
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
        for (RiotRegion region : RiotRegion.values()) {
            for (String tier : TIERS) {
                for (String queue : QUEUES) {
                    if (riotRateLimiter.availablePermits() < 40) {
                        log.info("Prefetch stopping early — rate limit permits low ({} available)",
                                riotRateLimiter.availablePermits());
                        log.info("Leaderboard prefetch cycle complete (partial)");
                        return;
                    }
                    try {
                        prefetchOne(tier, queue, region);
                    } catch (Exception e) {
                        log.warn("Prefetch failed for {}:{}:{}: {}", tier, queue, region, e.getMessage());
                    }
                }
            }
        }
        log.info("Leaderboard prefetch cycle complete");
    }

    private boolean isRedisAvailable() {
        try {
            String result = redisTemplate.getConnectionFactory().getConnection().ping();
            return "PONG".equals(result);
        } catch (Exception e) {
            return false;
        }
    }

    private void prefetchOne(String tier, String queue, RiotRegion region) {
        String json = riotApiService.getLeagueByTier(tier, queue, region);
        try {
            JsonNode root = objectMapper.readTree(json);
            String leagueTier = root.path("tier").asText(tier.toUpperCase());
            JsonNode entries = root.path("entries");

            List<RawEntry> rawEntries = new ArrayList<>();
            for (JsonNode e : entries) {
                String puuid = e.path("puuid").asText("");
                String fallbackName = e.path("summonerName").asText("");
                String rank = e.path("rank").asText("I");
                int lp = e.path("leaguePoints").asInt(0);
                int wins = e.path("wins").asInt(0);
                int losses = e.path("losses").asInt(0);
                rawEntries.add(new RawEntry(puuid, fallbackName, rank, lp, wins, losses));
            }

            rawEntries.sort(Comparator.comparingInt(RawEntry::lp).reversed());

            int limit = "master".equalsIgnoreCase(tier)
                    ? Math.min(rawEntries.size(), maxMasterEntries)
                    : rawEntries.size();

            List<ResolvedEntry> resolved = new ArrayList<>();
            for (int i = 0; i < limit; i++) {
                // Back off if rate limiter permits are running low
                if (riotRateLimiter.availablePermits() < 50) {
                    log.info("Prefetch pausing for {}:{}:{} at entry {}/{} — rate limit permits low",
                            tier, queue, region, i, limit);
                    break;
                }

                RawEntry raw = rawEntries.get(i);
                String name = resolveName(raw.puuid(), raw.fallbackName(), region);
                int profileIconId = resolveProfileIcon(raw.puuid(), region);
                int total = raw.wins() + raw.losses();
                double winRate = total > 0 ? Math.round((double) raw.wins() / total * 1000.0) / 10.0 : 0.0;
                resolved.add(new ResolvedEntry(name, raw.puuid(), leagueTier, raw.rank(),
                        raw.lp(), raw.wins(), raw.losses(), winRate, profileIconId));

                try {
                    Thread.sleep(100);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }

            String redisKey = "lb:prefetched:" + region.name() + ":" + tier + ":" + queue;
            String value = objectMapper.writeValueAsString(resolved);
            redisTemplate.opsForValue().set(redisKey, value, CACHE_TTL);
            log.info("Prefetched {} entries for {}:{}:{}", resolved.size(), tier, queue, region);
        } catch (Exception e) {
            log.warn("Failed to prefetch {}:{}:{}: {}", tier, queue, region, e.getMessage());
        }
    }

    private String resolveName(String puuid, String fallbackName, RiotRegion region) {
        if (puuid.isEmpty()) {
            return fallbackName.isEmpty() ? "Unknown" : fallbackName;
        }
        try {
            String accountJson = riotApiService.getAccountByPuuid(puuid, region);
            JsonNode account = objectMapper.readTree(accountJson);
            String gameName = account.path("gameName").asText("");
            String tagLine = account.path("tagLine").asText("");
            if (!gameName.isEmpty()) {
                return tagLine.isEmpty() ? gameName : gameName + "#" + tagLine;
            }
        } catch (Exception e) {
            log.debug("Prefetch: failed to resolve name for puuid {}: {}", puuid, e.getMessage());
        }
        return fallbackName.isEmpty() ? "Unknown" : fallbackName;
    }

    private int resolveProfileIcon(String puuid, RiotRegion region) {
        if (puuid.isEmpty()) {
            return 0;
        }
        try {
            String summonerJson = riotApiService.getSummonerByPuuid(puuid, region);
            JsonNode summoner = objectMapper.readTree(summonerJson);
            return summoner.path("profileIconId").asInt(0);
        } catch (Exception e) {
            log.debug("Prefetch: failed to resolve profile icon for puuid {}: {}", puuid, e.getMessage());
            return 0;
        }
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

    private record RawEntry(String puuid, String fallbackName, String rank, int lp, int wins, int losses) {}
}
