package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.*;
import com.jw.backend.region.RiotRegion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Riot Games API client with Redis-backed response caching.
 *
 * <p>Riot enforces strict rate limits (20 req/s, 100 req/2min per key). To stay within
 * budget and keep response times low, every API call is cached in Redis with a
 * per-endpoint TTL tuned to how often the underlying data actually changes:</p>
 *
 * <ul>
 *   <li>Account lookups — 24h (PUUIDs don't change)</li>
 *   <li>Match IDs list — 30s (new games appear frequently)</li>
 *   <li>Match details — 10min (immutable once the game ends)</li>
 *   <li>Summoner/Ranked — 30min (changes infrequently)</li>
 * </ul>
 *
 * <p>Using Redis (vs. in-process caching) means the cache survives container restarts
 * and is shared across horizontal replicas — important for production on EC2.</p>
 *
 * <p>If Redis is temporarily unreachable, cache operations degrade gracefully to a
 * cache-miss (we hit Riot directly) rather than failing the request.</p>
 */
@Service
public class RiotApiService {

    private static final Logger log = LoggerFactory.getLogger(RiotApiService.class);

    private final String apiKey;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final RiotRateLimiter riotRateLimiter;

    // Pools RestClient instances per base URL to reuse HTTP connections
    private final ConcurrentHashMap<String, RestClient> clientCache = new ConcurrentHashMap<>();

    public RiotApiService(@Value("${riot.api.key}") String apiKey,
                          ObjectMapper objectMapper,
                          StringRedisTemplate redisTemplate,
                          RiotRateLimiter riotRateLimiter) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        this.riotRateLimiter = riotRateLimiter;
    }

    private RestClient getClient(String baseUrl) {
        return clientCache.computeIfAbsent(baseUrl, url ->
                RestClient.builder().baseUrl(url).build());
    }

    /** Account-v1 reverse lookup by PUUID. ~24h TTL (randomized, see accountByPuuidTtlMs). */
    public String getAccountByPuuid(String puuid, RiotRegion region) {
        long ttlMs = accountByPuuidTtlMs();

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "account-puuid:" + region.routing() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = getClient(baseUrl).get()
                .uri("/riot/account/v1/accounts/by-puuid/{puuid}", puuid)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /** Cache-only account lookup by PUUID — never calls Riot. Returns null on a cache miss. */
    public String peekAccountByPuuid(String puuid, RiotRegion region) {
        return getCached("account-puuid:" + region.routing() + ":" + puuid);
    }

    /**
     * Best-effort variant of {@link #getAccountByPuuid} for leaderboard names. Returns the cached
     * account if present; otherwise calls Riot only while more than {@code reservePermits} rate-limit
     * permits are left, waiting up to {@code maxWaitMs} for that, so interactive lookups keep headroom.
     * Returns null when the call is skipped or fails.
     */
    public String tryGetAccountByPuuid(String puuid, RiotRegion region, int reservePermits, long maxWaitMs) {
        String cacheKey = "account-puuid:" + region.routing() + ":" + puuid;
        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        if (!riotRateLimiter.tryAcquire(reservePermits, maxWaitMs)) {
            return null;
        }
        try {
            String result = getClient("https://" + region.routing() + ".api.riotgames.com").get()
                    .uri("/riot/account/v1/accounts/by-puuid/{puuid}", puuid)
                    .header("X-Riot-Token", apiKey)
                    .retrieve()
                    .body(String.class);
            putCached(cacheKey, result, accountByPuuidTtlMs());
            return result;
        } catch (Exception e) {
            log.debug("Best-effort account lookup failed for puuid {}: {}", puuid, e.getMessage());
            return null;
        }
    }

    /** Account-v1 lookup. 24h TTL — PUUIDs and Riot IDs are effectively permanent. */
    public String getAccountByRiotId(String gameName, String tagLine, RiotRegion region) {
        long ttlMs = 24L * 60 * 60 * 1000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "account:" + region.routing() + ":" + gameName.toLowerCase() + "#" + tagLine.toLowerCase();

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = getClient(baseUrl).get()
                .uri("/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}", gameName, tagLine)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        refreshAccountByPuuidCache(result, region);
        return result;
    }

    /** Match-v5 IDs. 30s TTL — new games can appear any time. */
    public String getRecentMatchIds(String puuid, RiotRegion region, int count) {
        return getRecentMatchIds(puuid, region, count, 0);
    }

    public String getRecentMatchIds(String puuid, RiotRegion region, int count, int start) {
        return getRecentMatchIds(puuid, region, count, start, null);
    }

    /**
     * @param queue Riot queue ID to filter by (e.g. 420 for ranked solo), or null for all queues.
     *              Filtering on Riot's side means asking for 5 ranked games costs 5 detail calls,
     *              not however many ARAMs and normals came in between.
     */
    public String getRecentMatchIds(String puuid, RiotRegion region, int count, int start, Integer queue) {
        long ttlMs = 30_000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "matchIds:" + region.routing() + ":" + puuid + ":start=" + start + ":count=" + count
                + (queue != null ? ":queue=" + queue : "");

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = queue == null
                ? getClient(baseUrl).get()
                        .uri("/lol/match/v5/matches/by-puuid/{puuid}/ids?start={start}&count={count}", puuid, start, count)
                        .header("X-Riot-Token", apiKey)
                        .retrieve()
                        .body(String.class)
                : getClient(baseUrl).get()
                        .uri("/lol/match/v5/matches/by-puuid/{puuid}/ids?start={start}&count={count}&queue={queue}",
                                puuid, start, count, queue)
                        .header("X-Riot-Token", apiKey)
                        .retrieve()
                        .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /** Champion-Mastery-v4 top champions. 1h TTL — mastery points change slowly. */
    public String getTopChampionMasteries(String puuid, RiotRegion region, int count) {
        long ttlMs = 60L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "mastery-top:" + region.platform() + ":" + puuid + ":count=" + count;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = getClient(baseUrl).get()
                .uri("/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top?count={count}", puuid, count)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /** Match-v5 detail. 10min TTL — match data is immutable once the game ends. */
    public String getMatchDetail(String matchId, RiotRegion region) {
        long ttlMs = 10L * 60 * 1000;

        String baseUrl = "https://" + region.routing() + ".api.riotgames.com";
        String cacheKey = "matchDetail:" + region.routing() + ":" + matchId;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = getClient(baseUrl).get()
                .uri("/lol/match/v5/matches/{matchId}", matchId)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    // --- Redis cache-aside helpers ---
    // On Redis failure, we log and degrade to a cache miss (hit Riot directly).
    // This keeps the app functional even if Redis goes down temporarily.

    private String getCached(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.warn("Redis GET failed for key [{}], treating as cache miss", key, e);
            return null;
        }
    }

    private void putCached(String key, String value, long ttlMs) {
        try {
            redisTemplate.opsForValue().set(key, value, Duration.ofMillis(ttlMs));
        } catch (Exception e) {
            log.warn("Redis SET failed for key [{}], response will not be cached", key, e);
        }
    }

    /** Summoner-v4. 30min TTL — profile data changes infrequently. */
    public String getSummonerByPuuid(String puuid, RiotRegion region) {
        long ttlMs = 30L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "summoner:" + region.platform() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = getClient(baseUrl).get()
                .uri("/lol/summoner/v4/summoners/by-puuid/{puuid}", puuid)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        refreshProfileIconCache(puuid, result, region);
        return result;
    }

    // Leaderboard caches. Icons change more often than Riot IDs, so they expire sooner. Each entry gets
    // a random spread so the thousands filled in one prefetch run don't all expire (and refetch) at once.
    private static final long PROFILE_ICON_TTL_MS = 12L * 60 * 60 * 1000;
    private static final long PROFILE_ICON_TTL_SPREAD_MS = 2L * 60 * 60 * 1000;
    private static final long ACCOUNT_BY_PUUID_TTL_MS = 24L * 60 * 60 * 1000;
    private static final long ACCOUNT_BY_PUUID_TTL_SPREAD_MS = 4L * 60 * 60 * 1000;

    /** 12h ± 2h. */
    static long profileIconTtlMs() {
        return randomizedTtl(PROFILE_ICON_TTL_MS, PROFILE_ICON_TTL_SPREAD_MS);
    }

    /** 24h ± 4h. */
    static long accountByPuuidTtlMs() {
        return randomizedTtl(ACCOUNT_BY_PUUID_TTL_MS, ACCOUNT_BY_PUUID_TTL_SPREAD_MS);
    }

    private static long randomizedTtl(long baseMs, long spreadMs) {
        return baseMs - spreadMs + ThreadLocalRandom.current().nextLong(2 * spreadMs + 1);
    }

    /**
     * Point the PUUID → Riot ID cache at a fresh Account-v1 response. Called when someone looks a
     * player up by Riot ID, so a renamed player shows their new name on leaderboards right away
     * instead of after the cached entry expires. Costs no extra Riot calls.
     */
    void refreshAccountByPuuidCache(String accountJson, RiotRegion region) {
        try {
            String puuid = objectMapper.readTree(accountJson).path("puuid").asText("");
            if (!puuid.isEmpty()) {
                putCached("account-puuid:" + region.routing() + ":" + puuid, accountJson, accountByPuuidTtlMs());
            }
        } catch (Exception e) {
            log.debug("Couldn't refresh account cache from Riot ID lookup: {}", e.getMessage());
        }
    }

    /**
     * Store the icon from a fresh Summoner-v4 response in the leaderboard icon cache. Called when
     * someone opens a profile, so an icon change shows on leaderboards right away. No extra Riot calls.
     */
    void refreshProfileIconCache(String puuid, String summonerJson, RiotRegion region) {
        Integer iconId = parseProfileIconId(summonerJson);
        if (iconId != null) {
            putCached("profile-icon:" + region.platform() + ":" + puuid, iconId.toString(), profileIconTtlMs());
        }
    }

    /**
     * Cache-only profile icon lookup — never calls Riot. Checks the icon cache (~12h), then any cached
     * Summoner-v4 response (e.g. from someone viewing that profile). Returns null on a miss.
     */
    public Integer peekProfileIconId(String puuid, RiotRegion region) {
        String iconKey = "profile-icon:" + region.platform() + ":" + puuid;
        String cachedIcon = getCached(iconKey);
        if (cachedIcon != null) {
            try {
                return Integer.parseInt(cachedIcon);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        String summonerJson = getCached("summoner:" + region.platform() + ":" + puuid);
        if (summonerJson == null) return null;
        Integer iconId = parseProfileIconId(summonerJson);
        if (iconId != null) putCached(iconKey, iconId.toString(), profileIconTtlMs());
        return iconId;
    }

    /**
     * Best-effort profile icon lookup for leaderboards. Uses the caches first; otherwise makes one
     * Summoner-v4 call only while more than {@code reservePermits} rate-limit permits are left,
     * waiting up to {@code maxWaitMs} for that. Returns null when the call is skipped or fails.
     */
    public Integer tryGetProfileIconId(String puuid, RiotRegion region, int reservePermits, long maxWaitMs) {
        Integer cached = peekProfileIconId(puuid, region);
        if (cached != null) return cached;

        if (!riotRateLimiter.tryAcquire(reservePermits, maxWaitMs)) {
            return null;
        }
        try {
            String summonerJson = getClient("https://" + region.platform() + ".api.riotgames.com").get()
                    .uri("/lol/summoner/v4/summoners/by-puuid/{puuid}", puuid)
                    .header("X-Riot-Token", apiKey)
                    .retrieve()
                    .body(String.class);
            putCached("summoner:" + region.platform() + ":" + puuid, summonerJson, 30L * 60 * 1000);
            Integer iconId = parseProfileIconId(summonerJson);
            if (iconId != null) {
                putCached("profile-icon:" + region.platform() + ":" + puuid, iconId.toString(), profileIconTtlMs());
            }
            return iconId;
        } catch (Exception e) {
            log.debug("Best-effort profile icon lookup failed for puuid {}: {}", puuid, e.getMessage());
            return null;
        }
    }

    private Integer parseProfileIconId(String summonerJson) {
        try {
            JsonNode icon = objectMapper.readTree(summonerJson).path("profileIconId");
            return icon.isInt() ? icon.asInt() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** League-v4 ranked entries. 30min TTL — same rationale as summoner data. */
    public String getRankedEntriesByPuuid(String puuid, RiotRegion region) {
        long ttlMs = 30L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "ranked:" + region.platform() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = getClient(baseUrl).get()
                .uri("/lol/league/v4/entries/by-puuid/{puuid}", puuid)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /**
     * League-v4 apex tier league data. 15min TTL — leaderboard rankings shift slowly.
     *
     * @param tier  one of "challenger", "grandmaster", or "master"
     * @param queue the ranked queue (e.g., "RANKED_SOLO_5x5")
     * @param region the Riot region
     * @return raw JSON string from League-v4
     */
    public String getLeagueByTier(String tier, String queue, RiotRegion region) {
        long ttlMs = 15L * 60 * 1000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "league:" + region.platform() + ":" + tier + ":" + queue;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        String result = getClient(baseUrl).get()
                .uri("/lol/league/v4/{tier}leagues/by-queue/{queue}", tier, queue)
                .header("X-Riot-Token", apiKey)
                .retrieve()
                .body(String.class);

        putCached(cacheKey, result, ttlMs);
        return result;
    }

    /**
     * Spectator-v5 active game lookup. 30s TTL — game state changes rapidly.
     * Returns null if the player is not currently in a game (Riot returns 404).
     */
    public String getActiveGame(String puuid, RiotRegion region) {
        long ttlMs = 30_000;

        String baseUrl = "https://" + region.platform() + ".api.riotgames.com";
        String cacheKey = "spectator:" + region.platform() + ":" + puuid;

        String cached = getCached(cacheKey);
        if (cached != null) return cached;

        riotRateLimiter.acquire();
        try {
            String result = getClient(baseUrl).get()
                    .uri("/lol/spectator/v5/active-games/by-summoner/{puuid}", puuid)
                    .header("X-Riot-Token", apiKey)
                    .retrieve()
                    .body(String.class);

            putCached(cacheKey, result, ttlMs);
            return result;
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            return null;
        }
    }

    private final Executor riotExecutor = Executors.newFixedThreadPool(6);

    public List<com.jw.backend.dto.MatchSummaryDto> getRecentMatchSummaries(String puuid, RiotRegion region, int count) {
        return getRecentMatchSummaries(puuid, region, count, 0);
    }

    /**
     * Fetches match IDs, then fans out detail requests in parallel (6 threads) to
     * keep latency reasonable when loading a page of 10-20 matches at once.
     */
    public List<com.jw.backend.dto.MatchSummaryDto> getRecentMatchSummaries(String puuid, RiotRegion region, int count, int start) {
        return getRecentMatchSummaries(puuid, region, count, start, null);
    }

    /** @param queue Riot queue ID to filter by, or null for all queues. */
    public List<com.jw.backend.dto.MatchSummaryDto> getRecentMatchSummaries(String puuid, RiotRegion region, int count, int start, Integer queue) {
        String idsJson = getRecentMatchIds(puuid, region, Math.max(count, 1), start, queue);

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
                }, riotExecutor).orTimeout(30, TimeUnit.SECONDS).exceptionally(ex -> {
                    log.warn("Failed to fetch match {}: {}", matchId, ex.getMessage());
                    return null;
                }))
                .toList();

        return futures.stream().map(CompletableFuture::join).filter(Objects::nonNull).toList();
    }

    /**
     * Transforms the raw Match-v5 JSON blob into our structured DTO, grouping
     * participants by team and extracting objectives, runes, items, and vision stats.
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
     * Extracts a single player's perspective from a full 10-player match payload,
     * splitting participants into allies vs. enemies based on team ID.
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
            String individualPosition = me != null ? me.path("individualPosition").asText("") : "";

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
                    totalDamageDealtToChampions, goldEarned, individualPosition
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse match detail JSON for " + matchId, e);
        }
    }

}
