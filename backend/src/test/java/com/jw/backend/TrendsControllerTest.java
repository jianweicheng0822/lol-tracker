/**
 * @file TrendsControllerTest.java
 * @description Unit tests for the trends controller endpoints (champions, matches, LP).
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.dto.ChampionStatsDto;
import com.jw.backend.dto.LpSnapshotDto;
import com.jw.backend.dto.MatchTrendPointDto;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.MatchHistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the {@link TrendsController} for retrieving champion stats, match trend
 * data points, and LP history snapshots, including default parameter handling.
 */
@WebMvcTest(TrendsController.class)
@AutoConfigureMockMvc(addFilters = false)
class TrendsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private MatchHistoryService matchHistoryService;

    @MockitoBean
    private LpTrackingService lpTrackingService;

    /** Verify that champion stats are returned with correct aggregated values. */
    @Test
    void getChampionStats_returnsOk() throws Exception {
        List<ChampionStatsDto> stats = List.of(
            new ChampionStatsDto("Ahri", 10, 7, 70.0, 8.0, 3.0, 7.0, 5.0, 15000, 180.0)
        );
        when(matchHistoryService.getChampionStats("test-puuid")).thenReturn(stats);

        mockMvc.perform(get("/api/trends/champions").param("puuid", "test-puuid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].championName").value("Ahri"))
            .andExpect(jsonPath("$[0].games").value(10));
    }

    /** Verify that a missing puuid for champion stats returns HTTP 400. */
    @Test
    void getChampionStats_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/trends/champions"))
            .andExpect(status().isBadRequest());
    }

    /** Verify that match trend points are returned successfully. */
    @Test
    void getMatchTrends_returnsOk() throws Exception {
        List<MatchTrendPointDto> trends = List.of(
            new MatchTrendPointDto("NA1_123", 1700000000000L, true, 10, 2, 8, 20000, 15000, 200, "Ahri", 420)
        );
        when(matchHistoryService.getMatchTrends("test-puuid")).thenReturn(trends);

        mockMvc.perform(get("/api/trends/matches").param("puuid", "test-puuid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].matchId").value("NA1_123"));
    }

    /** Verify that a missing puuid for match trends returns HTTP 400. */
    @Test
    void getMatchTrends_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/trends/matches"))
            .andExpect(status().isBadRequest());
    }

    /** Verify that LP history defaults to RANKED_SOLO_5x5 queue type. */
    @Test
    void getLpHistory_withDefaultQueueType_returnsOk() throws Exception {
        List<LpSnapshotDto> snapshots = List.of(
            new LpSnapshotDto("RANKED_SOLO_5x5", "GOLD", "I", 75, 1700000000000L)
        );
        when(lpTrackingService.getLpHistory("test-puuid", "RANKED_SOLO_5x5")).thenReturn(snapshots);

        mockMvc.perform(get("/api/trends/lp").param("puuid", "test-puuid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].tier").value("GOLD"));

        verify(lpTrackingService).getLpHistory("test-puuid", "RANKED_SOLO_5x5");
    }

    /** Verify that a custom queueType parameter is passed through correctly. */
    @Test
    void getLpHistory_withCustomQueueType_returnsOk() throws Exception {
        when(lpTrackingService.getLpHistory("test-puuid", "RANKED_FLEX_SR")).thenReturn(List.of());

        mockMvc.perform(get("/api/trends/lp")
                .param("puuid", "test-puuid")
                .param("queueType", "RANKED_FLEX_SR"))
            .andExpect(status().isOk());

        verify(lpTrackingService).getLpHistory("test-puuid", "RANKED_FLEX_SR");
    }

    /** Verify that a missing puuid for LP history returns HTTP 400. */
    @Test
    void getLpHistory_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/trends/lp"))
            .andExpect(status().isBadRequest());
    }
}
