/**
 * @file RiotApiService.java
 * @description Service client for the Riot Games API with in-memory response caching.
 * @module backend.service
 */
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

/**
 * Centralized Riot API client that caches responses in-memory to respect rate limits.
 *
 * <p>Riot enforces 20 req/s and 100 req/2min limits per API key. This service applies
 * per-endpoint TTL caching to minimize redundant calls. Match detail fetches are
 * parallelized via a fixed thread pool for improved latency on batch operations.</p>
 *
 * <p>The simple TTL cache is sufficient for single-instance deployments. Swap for Redis
 * or similar if the application scales horizontally.</p>
 */
@Service
public class RiotApiService {

    private final String apiKey;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, RestClient> clientCache = new ConcurrentHashMap<>();

    /**
     * Initialize the service with the Riot API key and JSON mapper.
     *
     * @param apiKey       Riot Games API key from application properties
     * @param objectMapper Jackson mapper for JSON parsing
     */
    public RiotApiService(@Value("${riot.api.key}") String apiKey, ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
    }

    /**
     * Retrieve or create a RestClient for the given base URL.
     *
     * <p>Clients are cached to reuse underlying connection pools.</p>
     *
     * @param baseUrl the Riot API regional base URL
     * @return a configured RestClient instance
     */
    private RestClient getClient(String baseUrl) {
        return clientCache.computeIfAbsent(baseUrl, url ->
                RestClient.builder().baseUrl(url).build());
    }

    /**
     * Look up a Riot account by game name and tag line via Account-v1.
     *
     * <p>Uses the routing region (americas/europe/asia). Account data is stable,
     * so a 24-hour TTL is applied.</p>
     *
     * @param gameName the player's game name
     * @param tagLine  the player's tag line
     * @param region   the Riot region configuration
     * @return raw JSON response from Account-v1
     */
    public String getAccountByRiotId(String gameName, String tagLine, RiotRegion region) {
        long ttlMs = 24L * 60 * 60 * 1000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "account:" + region.routing() + ":" + gameName.toLowerCase() + "#" + tagLine.toLowerCase();

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        String result = getClient(baseUrl).get()
                .uri("/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}", gameName, tagLine)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /**
     * Retrieve recent match IDs for a player via Match-v5.
     *
     * <p>Short 30-second TTL since new games appear frequently.</p>
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot region configuration
     * @param count  number of match IDs to retrieve
     * @return raw JSON array of match ID strings
     */
    public String getRecentMatchIds(String puuid, RiotRegion region, int count) {
        return getRecentMatchIds(puuid, region, count, 0);
    }

    /**
     * Retrieve recent match IDs with pagination offset via Match-v5.
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot region configuration
     * @param count  number of match IDs to retrieve
     * @param start  pagination offset index
     * @return raw JSON array of match ID strings
     */
    public String getRecentMatchIds(String puuid, RiotRegion region, int count, int start) {
        long ttlMs = 30_000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "matchIds:" + region.routing() + ":" + puuid + ":start=" + start + ":count=" + count;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        String result = getClient(baseUrl).get()
                .uri("/lol/match/v5/matches/by-puuid/{puuid}/ids?start={start}&count={count}", puuid, start, count)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /**
     * Retrieve full match detail JSON via Match-v5.
     *
     * <p>Match data is immutable once completed; a conservative 10-minute TTL is used.</p>
     *
     * @param matchId the Riot match identifier (e.g., "NA1_4567890123")
     * @param region  the Riot region configuration
     * @return raw JSON match detail payload
     */
    public String getMatchDetail(String matchId, RiotRegion region) {
        long ttlMs = 10L * 60 * 1000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "matchDetail:" + region.routing() + ":" + matchId;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        String result = getClient(baseUrl).get()
                .uri("/lol/match/v5/matches/{matchId}", matchId)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    // -------------------------------------------------------------------------
    // In-memory TTL cache
    // -------------------------------------------------------------------------

    /**
     * Simple TTL cache entry holding a value and its expiration timestamp.
     */
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

    /**
     * Retrieve a cached value if present and not expired.
     *
     * @param key the cache key
     * @return the cached value, or null if absent or expired
     */
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

    /**
     * Store a value in the cache with the specified TTL.
     *
     * <p>Performs lazy eviction of expired entries when the cache exceeds 1000 entries
     * to prevent unbounded memory growth.</p>
     *
     * @param key    the cache key
     * @param value  the value to cache
     * @param ttlMs  time-to-live in milliseconds
     */
    private void putCached(String key, String value, long ttlMs) {
        if (cache.size() > 1000) {
            long now = System.currentTimeMillis();
            cache.entrySet().removeIf(e -> e.getValue().isExpired(now));
        }

        long expiresAt = System.currentTimeMillis() + ttlMs;
        cache.put(key, new CacheEntry(value, expiresAt));
    }

    /**
     * Retrieve summoner profile data by PUUID via Summoner-v4.
     *
     * <p>Uses the platform region (e.g., na1) rather than the routing region.
     * A 30-minute TTL balances freshness with rate limit conservation.</p>
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot region configuration
     * @return raw JSON response from Summoner-v4
     */
    public String getSummonerByPuuid(String puuid, RiotRegion region) {
        long ttlMs = 30L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "summoner:" + region.platform() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        String result = getClient(baseUrl).get()
                .uri("/lol/summoner/v4/summoners/by-puuid/{puuid}", puuid)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /**
     * Retrieve ranked league entries for a player via League-v4.
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot region configuration
     * @return raw JSON array of ranked entries
     */
    public String getRankedEntriesByPuuid(String puuid, RiotRegion region) {
        long ttlMs = 30L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "ranked:" + region.platform() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        String result = getClient(baseUrl).get()
                .uri("/lol/league/v4/entries/by-puuid/{puuid}", puuid)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    private final Executor riotExecutor = Executors.newFixedThreadPool(6);

    /**
     * Retrieve match summaries for a player's recent games (no pagination offset).
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot region configuration
     * @param count  number of matches to retrieve
     * @return list of parsed match summary DTOs
     */
    public List<com.jw.backend.dto.MatchSummaryDto> getRecentMatchSummaries(String puuid, RiotRegion region, int count) {
        return getRecentMatchSummaries(puuid, region, count, 0);
    }

    /**
     * Retrieve match summaries with parallel detail fetching for improved latency.
     *
     * <p>Match IDs are fetched first, then individual match details are retrieved
     * concurrently using a fixed thread pool. Each detail response is extracted
     * into the requesting player's perspective.</p>
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot region configuration
     * @param count  number of matches to retrieve
     * @param start  pagination offset index
     * @return list of parsed match summary DTOs
     * @throws RuntimeException if match ID JSON parsing fails
     */
    public List<com.jw.backend.dto.MatchSummaryDto> getRecentMatchSummaries(String puuid, RiotRegion region, int count, int start) {
        String idsJson = getRecentMatchIds(puuid, region, Math.max(count, 1), start);

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

        List<CompletableFuture<com.jw.backend.dto.MatchSummaryDto>> futures = top.stream()
                .map(matchId -> CompletableFuture.supplyAsync(() -> {
                    String detailJson = getMatchDetail(matchId, region);
                    return extractSummaryFromMatchDetail(detailJson, puuid, matchId);
                }, riotExecutor))
                .toList();

        return futures.stream().map(CompletableFuture::join).toList();
    }

    /**
     * Parse a full match detail JSON into a structured DTO with team groupings.
     *
     * <p>Maps Riot's flat participant array into teams with objectives data,
     * and extracts detailed per-participant statistics including runes, items,
     * and vision metrics.</p>
     *
     * @param detailJson raw JSON match detail from Match-v5
     * @param matchId    the match identifier for error reporting
     * @return fully structured match detail DTO
     * @throws RuntimeException if JSON parsing fails
     */
    public com.jw.backend.dto.MatchDetailDto extractFullMatchDetail(String detailJson, String matchId) {
        try {
            JsonNode root = objectMapper.readTree(detailJson);
            JsonNode info = root.path("info");
            JsonNode participantsNode = info.path("participants");

            int queueId = info.path("queueId").asInt(0);
            long duration = info.path("gameDuration").asLong(0);
            long endTs = info.path("gameEndTimestamp").asLong(0);
            String gameMode = info.path("gameMode").asText("");
            String gameVersion = info.path("gameVersion").asText("");

            List<com.jw.backend.dto.MatchDetailDto.TeamDto> teams = new ArrayList<>();
            JsonNode teamsNode = info.path("teams");
            if (teamsNode.isArray()) {
                for (JsonNode t : teamsNode) {
                    int teamId = t.path("teamId").asInt(0);
                    boolean win = t.path("win").asBoolean(false);

                    List<Integer> bans = new ArrayList<>();
                    JsonNode bansNode = t.path("bans");
                    if (bansNode.isArray()) {
                        for (JsonNode b : bansNode) {
                            bans.add(b.path("championId").asInt(0));
                        }
                    }

                    JsonNode obj = t.path("objectives");
                    int baronKills = obj.path("baron").path("kills").asInt(0);
                    int dragonKills = obj.path("dragon").path("kills").asInt(0);
                    int towerKills = obj.path("tower").path("kills").asInt(0);

                    teams.add(new com.jw.backend.dto.MatchDetailDto.TeamDto(
                            teamId, win, bans,
                            new com.jw.backend.dto.MatchDetailDto.ObjectivesDto(baronKills, dragonKills, towerKills)
                    ));
                }
            }

            List<com.jw.backend.dto.MatchDetailParticipantDto> participants = new ArrayList<>();
            for (JsonNode p : participantsNode) {
                String name = p.path("riotIdGameName").asText(p.path("summonerName").asText("Unknown"));
                String tagline = p.path("riotIdTagline").asText("");
                String champion = p.path("championName").asText("Unknown");
                String puuid = p.path("puuid").asText("");
                int teamId = p.path("teamId").asInt(0);
                int kills = p.path("kills").asInt(0);
                int deaths = p.path("deaths").asInt(0);
                int assists = p.path("assists").asInt(0);
                int champLevel = p.path("champLevel").asInt(0);
                int dmgDealt = p.path("totalDamageDealtToChampions").asInt(0);
                int dmgTaken = p.path("totalDamageTaken").asInt(0);
                int gold = p.path("goldEarned").asInt(0);

                int[] items = new int[7];
                for (int i = 0; i < 7; i++) {
                    items[i] = p.path("item" + i).asInt(0);
                }

                int totalMinions = p.path("totalMinionsKilled").asInt(0);
                int neutralMinions = p.path("neutralMinionsKilled").asInt(0);
                int spell1 = p.path("summoner1Id").asInt(0);
                int spell2 = p.path("summoner2Id").asInt(0);

                int primaryRuneId = 0;
                int secondaryRuneStyleId = 0;
                JsonNode styles = p.path("perks").path("styles");
                if (styles.isArray() && styles.size() > 0) {
                    JsonNode primarySelections = styles.get(0).path("selections");
                    if (primarySelections.isArray() && primarySelections.size() > 0) {
                        primaryRuneId = primarySelections.get(0).path("perk").asInt(0);
                    }
                    if (styles.size() > 1) {
                        secondaryRuneStyleId = styles.get(1).path("style").asInt(0);
                    }
                }

                int wardsPlaced = p.path("wardsPlaced").asInt(0);
                int wardsKilled = p.path("wardsKilled").asInt(0);
                int visionWards = p.path("visionWardsBoughtInGame").asInt(0);
                int doubleKills = p.path("doubleKills").asInt(0);
                int tripleKills = p.path("tripleKills").asInt(0);
                int quadraKills = p.path("quadraKills").asInt(0);
                int pentaKills = p.path("pentaKills").asInt(0);
                boolean win = p.path("win").asBoolean(false);
                int placement = p.path("placement").asInt(0);
                int playerSubteamId = p.path("playerSubteamId").asInt(0);

                participants.add(new com.jw.backend.dto.MatchDetailParticipantDto(
                        name, tagline, champion, puuid, teamId,
                        kills, deaths, assists, champLevel,
                        dmgDealt, dmgTaken, gold, items,
                        totalMinions, neutralMinions, spell1, spell2,
                        primaryRuneId, secondaryRuneStyleId,
                        wardsPlaced, wardsKilled, visionWards,
                        doubleKills, tripleKills, quadraKills, pentaKills, win,
                        placement, playerSubteamId
                ));
            }

            return new com.jw.backend.dto.MatchDetailDto(
                    matchId, queueId, duration, endTs, gameMode, gameVersion, teams, participants
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse full match detail JSON for " + matchId, e);
        }
    }

    /**
     * Extract a single player's perspective from a 10-player match detail payload.
     *
     * <p>Locates the requesting player by PUUID within the participants array, then
     * partitions remaining participants into allies and enemies based on team ID.</p>
     *
     * @param detailJson raw JSON match detail from Match-v5
     * @param puuid      the requesting player's unique identifier
     * @param matchId    the match identifier for error reporting
     * @return match summary from the player's perspective
     * @throws RuntimeException if JSON parsing fails
     */
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
            int placement = me != null ? me.path("placement").asInt(0) : 0;

            long duration = info.path("gameDuration").asLong(0);
            long endTs = info.path("gameEndTimestamp").asLong(0);

            int championLevel = me != null ? me.path("champLevel").asInt(0) : 0;
            int summoner1Id = me != null ? me.path("summoner1Id").asInt(0) : 0;
            int summoner2Id = me != null ? me.path("summoner2Id").asInt(0) : 0;

            int[] items = new int[7];
            if (me != null) {
                for (int i = 0; i < 7; i++) {
                    items[i] = me.path("item" + i).asInt(0);
                }
            }

            int totalMinionsKilled = me != null ? me.path("totalMinionsKilled").asInt(0) : 0;
            int neutralMinionsKilled = me != null ? me.path("neutralMinionsKilled").asInt(0) : 0;
            int queueId = info.path("queueId").asInt(0);

            int primaryRuneId = 0;
            int secondaryRuneStyleId = 0;
            if (me != null) {
                JsonNode styles = me.path("perks").path("styles");
                if (styles.isArray() && styles.size() > 0) {
                    JsonNode primarySelections = styles.get(0).path("selections");
                    if (primarySelections.isArray() && primarySelections.size() > 0) {
                        primaryRuneId = primarySelections.get(0).path("perk").asInt(0);
                    }
                    if (styles.size() > 1) {
                        secondaryRuneStyleId = styles.get(1).path("style").asInt(0);
                    }
                }
            }

            int[] augments = new int[4];
            if (me != null) {
                for (int i = 0; i < 4; i++) {
                    augments[i] = me.path("playerAugment" + (i + 1)).asInt(0);
                }
            }

            int totalDamageDealtToChampions = me != null ? me.path("totalDamageDealtToChampions").asInt(0) : 0;
            int goldEarned = me != null ? me.path("goldEarned").asInt(0) : 0;

            int myTeamId = me != null ? me.path("teamId").asInt(0) : 0;

            int teamTotalKills = 0;
            List<com.jw.backend.dto.MatchParticipantDto> allies = new ArrayList<>();
            List<com.jw.backend.dto.MatchParticipantDto> enemies = new ArrayList<>();

            for (JsonNode p : participants) {
                String pPuuid = p.path("puuid").asText("");
                String pName = p.path("riotIdGameName").asText(p.path("summonerName").asText("Unknown"));
                String pTagline = p.path("riotIdTagline").asText("");
                String pChamp = p.path("championName").asText("Unknown");
                int pTeam = p.path("teamId").asInt(0);

                var dto = new com.jw.backend.dto.MatchParticipantDto(pName, pTagline, pChamp, pPuuid);

                if (pTeam == myTeamId) {
                    teamTotalKills += p.path("kills").asInt(0);
                    if (!pPuuid.equals(puuid)) {
                        allies.add(dto);
                    }
                } else {
                    enemies.add(dto);
                }
            }

            return new com.jw.backend.dto.MatchSummaryDto(
                    matchId, champion, kills, deaths, assists, win, duration, endTs,
                    championLevel, summoner1Id, summoner2Id, items,
                    totalMinionsKilled, neutralMinionsKilled, queueId, teamTotalKills,
                    allies, enemies,
                    primaryRuneId, secondaryRuneStyleId, augments, placement,
                    totalDamageDealtToChampions, goldEarned
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse match detail JSON for " + matchId, e);
        }
    }

}
