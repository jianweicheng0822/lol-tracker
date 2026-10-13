package com.jw.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.region.RiotRegion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaderboardPrefetchServiceTest {

    @Mock
    private RiotApiService riotApiService;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOps;

    @Mock
    private RiotRateLimiter riotRateLimiter;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private LeaderboardPrefetchService prefetchService;

    @BeforeEach
    void setUp() {
        prefetchService = new LeaderboardPrefetchService(riotApiService, objectMapper, redisTemplate, riotRateLimiter);
    }

    @Test
    void getCached_returnsDataFromRedis() throws Exception {
        List<LeaderboardPrefetchService.ResolvedEntry> entries = List.of(
                new LeaderboardPrefetchService.ResolvedEntry("Player1", "p1", "CHALLENGER", "I", 1200, 200, 80, 71.4, 1234)
        );
        String json = objectMapper.writeValueAsString(entries);

        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("lb:prefetched:NA:challenger:RANKED_SOLO_5x5")).thenReturn(json);

        Optional<List<LeaderboardPrefetchService.ResolvedEntry>> result =
                prefetchService.getCached("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        assertTrue(result.isPresent());
        assertEquals(1, result.get().size());
        assertEquals("Player1", result.get().get(0).summonerName());
        assertEquals(1234, result.get().get(0).profileIconId());
    }

    @Test
    void getCached_returnsEmptyWhenRedisIsEmpty() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("lb:prefetched:NA:challenger:RANKED_SOLO_5x5")).thenReturn(null);

        Optional<List<LeaderboardPrefetchService.ResolvedEntry>> result =
                prefetchService.getCached("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        assertTrue(result.isEmpty());
    }

    @Test
    void getCached_returnsEmptyOnRedisError() {
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis down"));

        Optional<List<LeaderboardPrefetchService.ResolvedEntry>> result =
                prefetchService.getCached("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        assertTrue(result.isEmpty());
    }

    private static final String EMPTY_LEAGUE = "{\"tier\":\"CHALLENGER\",\"entries\":[]}";

    private static String league(String tier, String... puuids) {
        StringBuilder entries = new StringBuilder();
        for (int i = 0; i < puuids.length; i++) {
            if (i > 0) entries.append(',');
            entries.append(String.format(
                    "{\"puuid\":\"%s\",\"rank\":\"I\",\"leaguePoints\":%d,\"wins\":10,\"losses\":10}",
                    puuids[i], 1000 - i));
        }
        return "{\"tier\":\"" + tier + "\",\"entries\":[" + entries + "]}";
    }

    @Test
    void prefetchCycle_coversSoloQueueInLeaderboardRegions_challengerFirst() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(riotApiService.getLeagueByTier(anyString(), anyString(), any())).thenReturn(EMPTY_LEAGUE);

        prefetchService.prefetchCycle();

        var inOrder = inOrder(riotApiService);
        for (String tier : List.of("challenger", "grandmaster", "master")) {
            for (RiotRegion region : List.of(RiotRegion.NA, RiotRegion.EUW, RiotRegion.KR)) {
                inOrder.verify(riotApiService).getLeagueByTier(tier, "RANKED_SOLO_5x5", region);
            }
        }
        verify(riotApiService, never()).getLeagueByTier(anyString(), eq("RANKED_FLEX_SR"), any());
        verify(riotApiService, never()).getLeagueByTier(anyString(), anyString(), eq(RiotRegion.JP));
    }

    @Test
    void prefetchOne_skipsUnresolvedPlayersAndKeepsGoing() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA))
                .thenReturn(league("CHALLENGER", "p1", "p2", "p3"));
        int reserve = LeaderboardPrefetchService.PREFETCH_RESERVE_PERMITS;
        when(riotApiService.tryGetAccountByPuuid("p1", RiotRegion.NA, reserve)).thenReturn("{\"gameName\":\"One\",\"tagLine\":\"NA1\"}");
        // p2 isn't cached and there's no budget — it should be skipped, not stop the loop
        when(riotApiService.tryGetAccountByPuuid("p2", RiotRegion.NA, reserve)).thenReturn(null);
        when(riotApiService.tryGetAccountByPuuid("p3", RiotRegion.NA, reserve)).thenReturn("{\"gameName\":\"Three\",\"tagLine\":\"NA1\"}");
        when(riotApiService.tryGetProfileIconId("p1", RiotRegion.NA, reserve)).thenReturn(11);
        when(riotApiService.tryGetProfileIconId("p3", RiotRegion.NA, reserve)).thenReturn(null);

        prefetchService.prefetchOne("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(valueOps).set(eq("lb:prefetched:NA:challenger:RANKED_SOLO_5x5"), json.capture(), eq(Duration.ofMinutes(60)));
        List<LeaderboardPrefetchService.ResolvedEntry> saved = objectMapper.readValue(json.getValue(), new TypeReference<>() {});
        assertEquals(List.of("p1", "p3"), saved.stream().map(LeaderboardPrefetchService.ResolvedEntry::puuid).toList());
        assertEquals("One#NA1", saved.get(0).summonerName());
        assertEquals(11, saved.get(0).profileIconId());
        assertEquals(0, saved.get(1).profileIconId());
        verify(riotApiService, never()).tryGetProfileIconId(eq("p2"), any(), anyInt());
    }

    @Test
    void prefetchOne_capsMasterTier() {
        ReflectionTestUtils.setField(prefetchService, "maxMasterEntries", 2);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(riotApiService.getLeagueByTier("master", "RANKED_SOLO_5x5", RiotRegion.KR))
                .thenReturn(league("MASTER", "p1", "p2", "p3"));

        prefetchService.prefetchOne("master", "RANKED_SOLO_5x5", RiotRegion.KR);

        verify(riotApiService, times(2)).tryGetAccountByPuuid(anyString(), eq(RiotRegion.KR), anyInt());
        verify(riotApiService, never()).tryGetAccountByPuuid(eq("p3"), any(), anyInt());
    }
}
