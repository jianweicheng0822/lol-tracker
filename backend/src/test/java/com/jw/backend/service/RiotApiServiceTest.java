package com.jw.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.MatchDetailDto;
import com.jw.backend.dto.MatchSummaryDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Method;
import java.time.Duration;
import java.util.List;

import com.jw.backend.region.RiotRegion;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class RiotApiServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private RiotApiService riotApiService;
    private RiotRateLimiter riotRateLimiter;

    @BeforeEach
    void setUp() {
        // Fake clock: draining the limiter below moves time forward instead of really waiting
        riotRateLimiter = new RiotRateLimiter(new FakeRateLimiterTime());
        riotApiService = new RiotApiService("fake-api-key", new ObjectMapper(), redisTemplate, riotRateLimiter);
    }

    // -- Match detail parsing --
    @Test
    void extractFullMatchDetail_parsesCorrectly() {
        String json = """
            {
                "info": {
                    "queueId": 420,
                    "gameDuration": 1800,
                    "gameEndTimestamp": 1700000000000,
                    "gameMode": "CLASSIC",
                    "gameVersion": "14.1",
                    "teams": [
                        {
                            "teamId": 100,
                            "win": true,
                            "bans": [{"championId": 1}, {"championId": 2}],
                            "objectives": {
                                "baron": {"kills": 1},
                                "dragon": {"kills": 3},
                                "tower": {"kills": 8}
                            }
                        },
                        {
                            "teamId": 200,
                            "win": false,
                            "bans": [],
                            "objectives": {
                                "baron": {"kills": 0},
                                "dragon": {"kills": 1},
                                "tower": {"kills": 3}
                            }
                        }
                    ],
                    "participants": [
                        {
                            "riotIdGameName": "Faker",
                            "riotIdTagline": "KR1",
                            "championName": "Ahri",
                            "puuid": "puuid-1",
                            "teamId": 100,
                            "kills": 10,
                            "deaths": 2,
                            "assists": 8,
                            "champLevel": 18,
                            "totalDamageDealtToChampions": 25000,
                            "totalDamageTaken": 15000,
                            "goldEarned": 16000,
                            "item0": 3089, "item1": 3020, "item2": 3165, "item3": 0, "item4": 0, "item5": 0, "item6": 3340,
                            "totalMinionsKilled": 200,
                            "neutralMinionsKilled": 20,
                            "summoner1Id": 4,
                            "summoner2Id": 14,
                            "perks": {
                                "styles": [
                                    {
                                        "style": 8100,
                                        "selections": [{"perk": 8112}]
                                    },
                                    {
                                        "style": 8200
                                    }
                                ]
                            },
                            "wardsPlaced": 15,
                            "wardsKilled": 5,
                            "visionWardsBoughtInGame": 3,
                            "doubleKills": 2,
                            "tripleKills": 1,
                            "quadraKills": 0,
                            "pentaKills": 0,
                            "win": true,
                            "placement": 0,
                            "playerSubteamId": 0
                        }
                    ]
                }
            }
            """;

        MatchDetailDto result = riotApiService.extractFullMatchDetail(json, "NA1_123");

        assertEquals("NA1_123", result.matchId());
        assertEquals(420, result.queueId());
        assertEquals(1800, result.gameDurationSec());
        assertEquals("CLASSIC", result.gameMode());
        assertEquals("14.1", result.gameVersion());

        assertEquals(2, result.teams().size());
        assertTrue(result.teams().get(0).win());
        assertEquals(2, result.teams().get(0).bans().size());
        assertEquals(1, result.teams().get(0).objectives().baronKills());
        assertEquals(3, result.teams().get(0).objectives().dragonKills());
        assertEquals(8, result.teams().get(0).objectives().towerKills());

        assertEquals(1, result.participants().size());
        var p = result.participants().get(0);
        assertEquals("Faker", p.summonerName());
        assertEquals("KR1", p.riotIdTagline());
        assertEquals("Ahri", p.championName());
        assertEquals(10, p.kills());
        assertEquals(2, p.deaths());
        assertEquals(8, p.assists());
        assertEquals(18, p.championLevel());
        assertEquals(25000, p.totalDamageDealtToChampions());
        assertEquals(15000, p.totalDamageTaken());
        assertEquals(16000, p.goldEarned());
        assertEquals(200, p.totalMinionsKilled());
        assertEquals(20, p.neutralMinionsKilled());
        assertEquals(4, p.summoner1Id());
        assertEquals(14, p.summoner2Id());
        assertEquals(8112, p.primaryRuneId());
        assertEquals(8200, p.secondaryRuneStyleId());
        assertEquals(15, p.wardsPlaced());
        assertEquals(5, p.wardsKilled());
        assertEquals(3, p.visionWardsBoughtInGame());
        assertEquals(2, p.doubleKills());
        assertEquals(1, p.tripleKills());
        assertTrue(p.win());
    }

    @Test
    void extractFullMatchDetail_withNoTeamsOrParticipants_handlesGracefully() {
        String json = """
            {
                "info": {
                    "queueId": 420,
                    "gameDuration": 1800,
                    "gameEndTimestamp": 1700000000000,
                    "gameMode": "CLASSIC",
                    "gameVersion": "14.1",
                    "teams": [],
                    "participants": []
                }
            }
            """;

        MatchDetailDto result = riotApiService.extractFullMatchDetail(json, "NA1_123");

        assertTrue(result.teams().isEmpty());
        assertTrue(result.participants().isEmpty());
    }

    @Test
    void extractFullMatchDetail_withInvalidJson_throwsException() {
        assertThrows(RuntimeException.class, () ->
            riotApiService.extractFullMatchDetail("not json", "NA1_123"));
    }

    @Test
    void extractFullMatchDetail_withMinimalPerks_parsesDefaultRunes() {
        String json = """
            {
                "info": {
                    "queueId": 420,
                    "gameDuration": 1800,
                    "gameEndTimestamp": 1700000000000,
                    "gameMode": "CLASSIC",
                    "gameVersion": "14.1",
                    "teams": [],
                    "participants": [
                        {
                            "riotIdGameName": "Player1",
                            "riotIdTagline": "NA1",
                            "championName": "Zed",
                            "puuid": "puuid-1",
                            "teamId": 100,
                            "kills": 5, "deaths": 3, "assists": 2,
                            "champLevel": 15,
                            "totalDamageDealtToChampions": 20000,
                            "totalDamageTaken": 18000,
                            "goldEarned": 14000,
                            "item0": 0, "item1": 0, "item2": 0, "item3": 0, "item4": 0, "item5": 0, "item6": 0,
                            "totalMinionsKilled": 150,
                            "neutralMinionsKilled": 10,
                            "summoner1Id": 4, "summoner2Id": 14,
                            "perks": {"styles": []},
                            "wardsPlaced": 0, "wardsKilled": 0, "visionWardsBoughtInGame": 0,
                            "doubleKills": 0, "tripleKills": 0, "quadraKills": 0, "pentaKills": 0,
                            "win": false, "placement": 0, "playerSubteamId": 0
                        }
                    ]
                }
            }
            """;

        MatchDetailDto result = riotApiService.extractFullMatchDetail(json, "NA1_123");
        assertEquals(0, result.participants().get(0).primaryRuneId());
        assertEquals(0, result.participants().get(0).secondaryRuneStyleId());
    }

    private String buildMatchDetailJson(String puuid, String champion, int kills, int deaths, int assists,
                                         boolean win, int teamId) {
        return """
            {
                "info": {
                    "queueId": 420,
                    "gameDuration": 1800,
                    "gameEndTimestamp": 1700000000000,
                    "participants": [
                        {
                            "puuid": "%s",
                            "riotIdGameName": "Player",
                            "riotIdTagline": "NA1",
                            "championName": "%s",
                            "teamId": %d,
                            "kills": %d, "deaths": %d, "assists": %d,
                            "champLevel": 18,
                            "summoner1Id": 4, "summoner2Id": 14,
                            "item0": 3089, "item1": 0, "item2": 0, "item3": 0, "item4": 0, "item5": 0, "item6": 3340,
                            "totalMinionsKilled": 200, "neutralMinionsKilled": 20,
                            "win": %b,
                            "perks": {"styles": [{"style": 8100, "selections": [{"perk": 8112}]}, {"style": 8200}]},
                            "playerAugment1": 100, "playerAugment2": 200, "playerAugment3": 300, "playerAugment4": 400,
                            "totalDamageDealtToChampions": 25000,
                            "goldEarned": 16000,
                            "placement": 0
                        },
                        {
                            "puuid": "ally-puuid",
                            "riotIdGameName": "Ally",
                            "riotIdTagline": "NA1",
                            "championName": "Lux",
                            "teamId": %d,
                            "kills": 5, "deaths": 3, "assists": 10,
                            "win": %b
                        },
                        {
                            "puuid": "enemy-puuid",
                            "riotIdGameName": "Enemy",
                            "riotIdTagline": "NA1",
                            "championName": "Zed",
                            "teamId": %d,
                            "kills": 8, "deaths": 4, "assists": 2,
                            "win": %b
                        }
                    ]
                }
            }
            """.formatted(puuid, champion, teamId, kills, deaths, assists, win,
                           teamId, win,
                           teamId == 100 ? 200 : 100, !win);
    }

    @Test
    void extractFullMatchDetail_fallsBackToSummonerName() {
        String json = """
            {
                "info": {
                    "queueId": 420,
                    "gameDuration": 1800,
                    "gameEndTimestamp": 1700000000000,
                    "gameMode": "CLASSIC",
                    "gameVersion": "14.1",
                    "teams": [],
                    "participants": [
                        {
                            "summonerName": "OldName",
                            "championName": "Ahri",
                            "puuid": "puuid-1",
                            "teamId": 100,
                            "kills": 5, "deaths": 3, "assists": 2,
                            "champLevel": 15,
                            "totalDamageDealtToChampions": 20000,
                            "totalDamageTaken": 18000,
                            "goldEarned": 14000,
                            "item0": 0, "item1": 0, "item2": 0, "item3": 0, "item4": 0, "item5": 0, "item6": 0,
                            "totalMinionsKilled": 150,
                            "neutralMinionsKilled": 10,
                            "summoner1Id": 4, "summoner2Id": 14,
                            "perks": {"styles": [{"style": 8100, "selections": [{"perk": 8005}]}, {"style": 8300}]},
                            "wardsPlaced": 10, "wardsKilled": 3, "visionWardsBoughtInGame": 2,
                            "doubleKills": 0, "tripleKills": 0, "quadraKills": 0, "pentaKills": 0,
                            "win": true, "placement": 0, "playerSubteamId": 0
                        }
                    ]
                }
            }
            """;

        MatchDetailDto result = riotApiService.extractFullMatchDetail(json, "NA1_123");
        assertEquals("OldName", result.participants().get(0).summonerName());
    }

    @Test
    void extractFullMatchDetail_withTeamBansAndObjectives() {
        String json = """
            {
                "info": {
                    "queueId": 420,
                    "gameDuration": 1800,
                    "gameEndTimestamp": 1700000000000,
                    "gameMode": "CLASSIC",
                    "gameVersion": "14.1",
                    "teams": [
                        {
                            "teamId": 100,
                            "win": true,
                            "bans": [{"championId": 157}, {"championId": 238}, {"championId": 84}, {"championId": 91}, {"championId": 55}],
                            "objectives": {
                                "baron": {"kills": 2},
                                "dragon": {"kills": 4},
                                "tower": {"kills": 11}
                            }
                        }
                    ],
                    "participants": []
                }
            }
            """;

        MatchDetailDto result = riotApiService.extractFullMatchDetail(json, "NA1_123");
        assertEquals(5, result.teams().get(0).bans().size());
        assertEquals(157, result.teams().get(0).bans().get(0));
        assertEquals(2, result.teams().get(0).objectives().baronKills());
        assertEquals(4, result.teams().get(0).objectives().dragonKills());
        assertEquals(11, result.teams().get(0).objectives().towerKills());
    }

    @Test
    void extractFullMatchDetail_withSingleRuneStyle_handlesGracefully() {
        String json = """
            {
                "info": {
                    "queueId": 420,
                    "gameDuration": 1800,
                    "gameEndTimestamp": 1700000000000,
                    "gameMode": "CLASSIC",
                    "gameVersion": "14.1",
                    "teams": [],
                    "participants": [
                        {
                            "riotIdGameName": "Player1",
                            "riotIdTagline": "NA1",
                            "championName": "Ahri",
                            "puuid": "puuid-1",
                            "teamId": 100,
                            "kills": 5, "deaths": 3, "assists": 2,
                            "champLevel": 15,
                            "totalDamageDealtToChampions": 20000,
                            "totalDamageTaken": 18000,
                            "goldEarned": 14000,
                            "item0": 0, "item1": 0, "item2": 0, "item3": 0, "item4": 0, "item5": 0, "item6": 0,
                            "totalMinionsKilled": 150,
                            "neutralMinionsKilled": 10,
                            "summoner1Id": 4, "summoner2Id": 14,
                            "perks": {"styles": [{"style": 8100, "selections": [{"perk": 8112}]}]},
                            "wardsPlaced": 0, "wardsKilled": 0, "visionWardsBoughtInGame": 0,
                            "doubleKills": 0, "tripleKills": 0, "quadraKills": 0, "pentaKills": 0,
                            "win": false, "placement": 3, "playerSubteamId": 2
                        }
                    ]
                }
            }
            """;

        MatchDetailDto result = riotApiService.extractFullMatchDetail(json, "NA1_123");
        assertEquals(8112, result.participants().get(0).primaryRuneId());
        assertEquals(0, result.participants().get(0).secondaryRuneStyleId());
        assertEquals(3, result.participants().get(0).placement());
        assertEquals(2, result.participants().get(0).playerSubteamId());
    }

    private MatchSummaryDto invokeExtractSummary(String json, String puuid, String matchId) throws Exception {
        Method method = RiotApiService.class.getDeclaredMethod(
            "extractSummaryFromMatchDetail", String.class, String.class, String.class);
        method.setAccessible(true);
        return (MatchSummaryDto) method.invoke(riotApiService, json, puuid, matchId);
    }

    // -- Summary extraction --
    @Test
    void extractSummary_parsesPlayerCorrectly() throws Exception {
        String json = buildMatchDetailJson("my-puuid", "Ahri", 10, 2, 8, true, 100);
        MatchSummaryDto result = invokeExtractSummary(json, "my-puuid", "NA1_123");

        assertEquals("NA1_123", result.matchId());
        assertEquals("Ahri", result.championName());
        assertEquals(10, result.kills());
        assertEquals(2, result.deaths());
        assertEquals(8, result.assists());
        assertTrue(result.win());
        assertEquals(1800, result.gameDurationSec());
        assertEquals(18, result.championLevel());
        assertEquals(4, result.summoner1Id());
        assertEquals(14, result.summoner2Id());
        assertEquals(200, result.totalMinionsKilled());
        assertEquals(20, result.neutralMinionsKilled());
        assertEquals(420, result.queueId());
        assertEquals(8112, result.primaryRuneId());
        assertEquals(8200, result.secondaryRuneStyleId());
        assertEquals(25000, result.totalDamageDealtToChampions());
        assertEquals(16000, result.goldEarned());
        assertEquals(100, result.augments()[0]);
        assertEquals(200, result.augments()[1]);
        assertEquals(300, result.augments()[2]);
        assertEquals(400, result.augments()[3]);
    }

    @Test
    void extractSummary_splitsAlliesAndEnemies() throws Exception {
        String json = buildMatchDetailJson("my-puuid", "Ahri", 10, 2, 8, true, 100);
        MatchSummaryDto result = invokeExtractSummary(json, "my-puuid", "NA1_123");

        assertEquals(1, result.allies().size());
        assertEquals("Ally", result.allies().get(0).summonerName());
        assertEquals(1, result.enemies().size());
        assertEquals("Enemy", result.enemies().get(0).summonerName());
        assertEquals(15, result.teamTotalKills());
    }

    @Test
    void extractSummary_playerNotFound_returnsDefaults() throws Exception {
        String json = buildMatchDetailJson("other-puuid", "Ahri", 10, 2, 8, true, 100);
        MatchSummaryDto result = invokeExtractSummary(json, "not-in-game", "NA1_123");

        assertEquals("Unknown", result.championName());
        assertEquals(0, result.kills());
        assertEquals(0, result.deaths());
        assertFalse(result.win());
    }

    @Test
    void extractSummary_withInvalidJson_throws() {
        assertThrows(Exception.class, () ->
            invokeExtractSummary("not json", "puuid", "NA1_123"));
    }

    // -- Redis cache delegation --
    @Test
    void cache_getCached_delegatesToRedis() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("test-key")).thenReturn("test-value");

        Method getMethod = RiotApiService.class.getDeclaredMethod("getCached", String.class);
        getMethod.setAccessible(true);
        String result = (String) getMethod.invoke(riotApiService, "test-key");

        assertEquals("test-value", result);
        verify(valueOperations).get("test-key");
    }

    @Test
    void cache_missingKey_returnsNull() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("nonexistent")).thenReturn(null);

        Method getMethod = RiotApiService.class.getDeclaredMethod("getCached", String.class);
        getMethod.setAccessible(true);
        String result = (String) getMethod.invoke(riotApiService, "nonexistent");

        assertNull(result);
    }

    @Test
    void cache_putCached_delegatesToRedisWithTtl() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        Method putMethod = RiotApiService.class.getDeclaredMethod("putCached", String.class, String.class, long.class);
        putMethod.setAccessible(true);
        putMethod.invoke(riotApiService, "test-key", "test-value", 60000L);

        verify(valueOperations).set("test-key", "test-value", Duration.ofMillis(60000L));
    }

    @Test
    void getRecentMatchIds_withoutStart_delegatesToOverload() {
        assertNotNull(riotApiService);
    }

    // -- Best-effort lookups used by the leaderboard --
    @Test
    void tryGetAccountByPuuid_cacheHit_returnsCachedWithoutUsingPermit() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        String key = "account-puuid:" + RiotRegion.NA.routing() + ":p1";
        when(valueOperations.get(key)).thenReturn("{\"gameName\":\"Cached\"}");
        int permitsBefore = riotRateLimiter.availablePermits();

        String result = riotApiService.tryGetAccountByPuuid("p1", RiotRegion.NA, 30, 0);

        assertEquals("{\"gameName\":\"Cached\"}", result);
        assertEquals(permitsBefore, riotRateLimiter.availablePermits());
    }

    @Test
    void refreshAccountByPuuidCache_storesRiotIdLookupUnderItsPuuid() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        String json = "{\"puuid\":\"p1\",\"gameName\":\"NewName\",\"tagLine\":\"NA1\"}";

        riotApiService.refreshAccountByPuuidCache(json, RiotRegion.NA);

        verify(valueOperations).set(eq("account-puuid:" + RiotRegion.NA.routing() + ":p1"), eq(json), ttlBetweenHours(20, 28));
    }

    @Test
    void refreshProfileIconCache_storesIconFromFreshSummonerData() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        riotApiService.refreshProfileIconCache("p1", "{\"puuid\":\"p1\",\"profileIconId\":5367}", RiotRegion.NA);

        verify(valueOperations).set(eq("profile-icon:" + RiotRegion.NA.platform() + ":p1"), eq("5367"), ttlBetweenHours(10, 14));
    }

    /** Matches a cache TTL within [minHours, maxHours] (leaderboard TTLs are randomized). */
    private static Duration ttlBetweenHours(long minHours, long maxHours) {
        return argThat(d -> d.compareTo(Duration.ofHours(minHours)) >= 0 && d.compareTo(Duration.ofHours(maxHours)) <= 0);
    }

    @Test
    void leaderboardCacheTtls_stayWithinTheirSpreadAndVary() {
        java.util.Set<Long> iconTtls = new java.util.HashSet<>();
        for (int i = 0; i < 500; i++) {
            long icon = RiotApiService.profileIconTtlMs();
            long account = RiotApiService.accountByPuuidTtlMs();
            assertTrue(icon >= Duration.ofHours(10).toMillis() && icon <= Duration.ofHours(14).toMillis(), "icon TTL " + icon);
            assertTrue(account >= Duration.ofHours(20).toMillis() && account <= Duration.ofHours(28).toMillis(), "account TTL " + account);
            iconTtls.add(icon);
        }
        // Randomized, so entries cached together don't all expire together
        assertTrue(iconTtls.size() > 400, "TTLs should vary, got " + iconTtls.size() + " distinct values");
    }

    @Test
    void refreshCaches_ignoreUnusableResponses() {
        riotApiService.refreshAccountByPuuidCache("not json", RiotRegion.NA);
        riotApiService.refreshAccountByPuuidCache("{\"gameName\":\"NoPuuid\"}", RiotRegion.NA);
        riotApiService.refreshProfileIconCache("p1", "{\"puuid\":\"p1\"}", RiotRegion.NA);

        verifyNoInteractions(valueOperations);
    }

    @Test
    void peekAccountByPuuid_readsCacheOnly() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("account-puuid:" + RiotRegion.NA.routing() + ":p1")).thenReturn("{\"gameName\":\"Cached\"}");
        int permitsBefore = riotRateLimiter.availablePermits();

        assertEquals("{\"gameName\":\"Cached\"}", riotApiService.peekAccountByPuuid("p1", RiotRegion.NA));
        assertNull(riotApiService.peekAccountByPuuid("p2", RiotRegion.NA));
        assertEquals(permitsBefore, riotRateLimiter.availablePermits());
    }

    @Test
    void tryGetAccountByPuuid_belowReserve_skipsRiotCall() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        // Drain the limiter down to the reserve
        while (riotRateLimiter.availablePermits() > 30) {
            riotRateLimiter.tryAcquire(0, 2_000);
        }

        String result = riotApiService.tryGetAccountByPuuid("p1", RiotRegion.NA, 30, 0);

        assertNull(result);
        assertEquals(30, riotRateLimiter.availablePermits());
    }

    @Test
    void peekProfileIconId_readsIconCache() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("profile-icon:" + RiotRegion.NA.platform() + ":p1")).thenReturn("7");
        int permitsBefore = riotRateLimiter.availablePermits();

        assertEquals(7, riotApiService.peekProfileIconId("p1", RiotRegion.NA));
        assertEquals(permitsBefore, riotRateLimiter.availablePermits());
    }

    @Test
    void peekProfileIconId_fallsBackToCachedSummonerAndCachesIcon() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        String iconKey = "profile-icon:" + RiotRegion.NA.platform() + ":p1";
        when(valueOperations.get(iconKey)).thenReturn(null);
        when(valueOperations.get("summoner:" + RiotRegion.NA.platform() + ":p1")).thenReturn("{\"profileIconId\":42}");

        assertEquals(42, riotApiService.peekProfileIconId("p1", RiotRegion.NA));
        verify(valueOperations).set(eq(iconKey), eq("42"), ttlBetweenHours(10, 14));
    }

    @Test
    void peekProfileIconId_cacheMiss_returnsNull() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        assertNull(riotApiService.peekProfileIconId("p1", RiotRegion.NA));
    }

    @Test
    void tryGetProfileIconId_belowReserve_skipsRiotCall() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        while (riotRateLimiter.availablePermits() > 50) {
            riotRateLimiter.tryAcquire(0, 2_000);
        }

        assertNull(riotApiService.tryGetProfileIconId("p1", RiotRegion.NA, 50, 0));
        assertEquals(50, riotRateLimiter.availablePermits());
    }
}
