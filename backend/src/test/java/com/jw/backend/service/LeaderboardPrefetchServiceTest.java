package com.jw.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.region.RiotRegion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

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
}
