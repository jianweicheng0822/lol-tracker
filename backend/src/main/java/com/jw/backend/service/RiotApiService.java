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

/** Handles all Riot Games API calls with in-memory caching and JSON parsing. */
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
        return getRecentMatchIds(puuid, region, count, 0);
    }

    public String getRecentMatchIds(String puuid, RiotRegion region, int count, int start) {
        // Recent matches changes often -> short TTL
        long ttlMs = 30_000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "matchIds:" + region.routing() + ":" + puuid + ":start=" + start + ":count=" + count;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        String result = client.get()
                .uri("/lol/match/v5/matches/by-puuid/{puuid}/ids?start={start}&count={count}", puuid, start, count)
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
     * League-v4 uses platform regions: na1 / euw1 / kr / ...
     * Uses the by-puuid endpoint directly — no summoner ID needed.
     */
    /**
     * Summoner-v4 uses platform regions: na1 / euw1 / kr / ...
     * Returns summoner data including profileIconId, summonerLevel, etc.
     */
    public String getSummonerByPuuid(String puuid, RiotRegion region) {
        long ttlMs = 30L * 60 * 1000;

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

    public String getRankedEntriesByPuuid(String puuid, RiotRegion region) {
        long ttlMs = 30L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "ranked:" + region.platform() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .build();

        String result = client.get()
                .uri("/lol/league/v4/entries/by-puuid/{puuid}", puuid)
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
        return getRecentMatchSummaries(puuid, region, count, 0);
    }

    public List<com.jw.backend.dto.MatchSummaryDto> getRecentMatchSummaries(String puuid, RiotRegion region, int count, int start) {
        // 1) Get recent match IDs (this already has caching in your code)
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
    /** Parses raw Riot match JSON into a structured MatchDetailDto with teams, objectives, and per-player stats. */
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

            // Parse teams
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

            // Parse participants
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

    /** Extracts a single player's match summary from raw Riot match JSON, including allies/enemies split. */
    private com.jw.backend.dto.MatchSummaryDto extractSummaryFromMatchDetail(String detailJson, String puuid, String matchId) {
        try {
            JsonNode root = objectMapper.readTree(detailJson);
            JsonNode info = root.path("info");
            JsonNode participants = info.path("participants");

            // Find the searched player in the participants list
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

            // Runes
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

            // Augments (Arena)
            int[] augments = new int[4];
            if (me != null) {
                for (int i = 0; i < 4; i++) {
                    augments[i] = me.path("playerAugment" + (i + 1)).asInt(0);
                }
            }

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
                    primaryRuneId, secondaryRuneStyleId, augments, placement
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse match detail JSON for " + matchId, e);
        }
    }

}
