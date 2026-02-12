package com.jw.backend.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import com.jw.backend.region.RiotRegion;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RiotApiService {

    private final String apiKey;

    public RiotApiService(@Value("${riot.api.key}") String apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Account-v1 uses routing regions: americas / europe / asia
     */
    public String getAccountByRiotId(String gameName, String tagLine, RiotRegion region) {
        // Account data is stable -> cache longer
        long ttlMs = 24L * 60 * 60 * 1000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "account:" + region.routing() + ":" + gameName.toLowerCase() + "#" + tagLine.toLowerCase();

        String cached = getCached(cacheKey);
        System.out.println("CACHE HIT: " + cacheKey);
        if (cached != null) return cached;

        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        String result = client.get()
                .uri("/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}", gameName, tagLine)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }
    /**
     * Match-v5 uses routing regions: americas / europe / asia
     * Returns a list of match IDs for a given PUUID.
     */
    public String getRecentMatchIds(String puuid, RiotRegion region, int count) {
        // Recent matches changes often -> short TTL
        long ttlMs = 30_000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "matchIds:" + region.routing() + ":" + puuid + ":count=" + count;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        String result = client.get()
                .uri("/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count={count}", puuid, count)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }
    /**
     * Match-v5 uses routing regions: americas / europe / asia
     * Returns raw match JSON for a given matchId.
     */
    public String getMatchDetail(String matchId, RiotRegion region) {
        // Match detail is heavy and stable -> medium TTL
        long ttlMs = 10L * 60 * 1000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "matchDetail:" + region.routing() + ":" + matchId;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        String result = client.get()
                .uri("/lol/match/v5/matches/{matchId}", matchId)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }
    private static final class CacheEntry {
        private final String value;
        private final long expiresAtMs;

        private CacheEntry(String value, long expiresAtMs) {
            this.value = value;
            this.expiresAtMs = expiresAtMs;
        }

        private boolean isExpired(long nowMs) {
            return nowMs >= expiresAtMs;
        }
    }
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private String getCached(String key) {
        CacheEntry entry = cache.get(key);
        if (entry == null) return null;

        long now = System.currentTimeMillis();
        if (entry.isExpired(now)) {
            cache.remove(key);
            return null;
        }
        return entry.value;
    }

    private void putCached(String key, String value, long ttlMs) {
        // Simple safety cap: avoid unbounded memory growth in a demo project.
        if (cache.size() > 1000) {
            cache.clear();
        }

        long expiresAt = System.currentTimeMillis() + ttlMs;
        cache.put(key, new CacheEntry(value, expiresAt));

    }
    /**
     * Summoner-v4 uses platform regions: na1 / euw1 / kr / ...
     */
    public String getSummonerByPuuid(String puuid, RiotRegion region) {
        long ttlMs = 24L * 60 * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "summoner:" + region.platform() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        String result = client.get()
                .uri("/lol/summoner/v4/summoners/by-puuid/{puuid}", puuid)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /**
     * League-v4 uses platform regions: na1 / euw1 / kr / ...
     */
    public String getRankedEntries(String summonerId, RiotRegion region) {
        long ttlMs = 30L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "ranked:" + region.platform() + ":" + summonerId;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        String result = client.get()
                .uri("/lol/league/v4/entries/by-summoner/{summonerId}", summonerId)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    // A small thread pool for parallel external calls (demo-friendly)
    private final Executor riotExecutor = Executors.newFixedThreadPool(6);
    public List<com.jw.backend.dto.MatchSummaryDto> getRecentMatchSummaries(String puuid, RiotRegion region, int count) {
        // 1) Get recent match IDs (this already has caching in your code)
        String idsJson = getRecentMatchIds(puuid, region, Math.max(count, 1));

        List<String> ids = new ArrayList<>();
        try {
            JsonNode arr = objectMapper.readTree(idsJson);
            for (JsonNode n : arr) {
                ids.add(n.asText());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse match ids JSON", e);
        }

        List<String> top = ids.stream().limit(count).toList();

        // 2) Fetch match details in parallel
        List<CompletableFuture<com.jw.backend.dto.MatchSummaryDto>> futures = top.stream()
                .map(matchId -> CompletableFuture.supplyAsync(() -> {
                    String detailJson = getMatchDetail(matchId, region); // cached + external call
                    return extractSummaryFromMatchDetail(detailJson, puuid, matchId);
                }, riotExecutor))
                .toList();

        // 3) Join results
        return futures.stream().map(CompletableFuture::join).toList();
    }
    private com.jw.backend.dto.MatchSummaryDto extractSummaryFromMatchDetail(String detailJson, String puuid, String matchId) {
        try {
            JsonNode root = objectMapper.readTree(detailJson);
            JsonNode info = root.path("info");
            JsonNode participants = info.path("participants");

            JsonNode me = null;
            for (JsonNode p : participants) {
                if (puuid.equals(p.path("puuid").asText())) {
                    me = p;
                    break;
                }
            }

            String champion = me != null ? me.path("championName").asText("Unknown") : "Unknown";
            int kills = me != null ? me.path("kills").asInt(0) : 0;
            int deaths = me != null ? me.path("deaths").asInt(0) : 0;
            int assists = me != null ? me.path("assists").asInt(0) : 0;
            boolean win = me != null && me.path("win").asBoolean(false);

            long duration = info.path("gameDuration").asLong(0);
            long endTs = info.path("gameEndTimestamp").asLong(0);

            return new com.jw.backend.dto.MatchSummaryDto(
                    matchId, champion, kills, deaths, assists, win, duration, endTs
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse match detail JSON for " + matchId, e);
        }
    }

}
