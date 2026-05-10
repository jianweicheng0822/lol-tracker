/**
 * @file StatsControllerTest.java
 * @description Unit tests for the player statistics controller endpoint.
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.dto.PlayerStatsDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.StatsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import com.jw.backend.security.JwtUtil;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the {@link StatsController} for computing and returning aggregated
 * player statistics, including custom count handling and parameter validation.
 */
@WebMvcTest(StatsController.class)
@AutoConfigureMockMvc(addFilters = false)
class StatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private StatsService statsService;

    /** Verify that valid parameters return player stats with correct values. */
    @Test
    void getPlayerStats_withValidParams_returnsOk() throws Exception {
        PlayerStatsDto stats = new PlayerStatsDto(10, 6, 4, 60.0, 5.2, 3.1, 7.8, 4.19);
        when(statsService.calculateStats("test-puuid", RiotRegion.NA, 10)).thenReturn(stats);

        mockMvc.perform(get("/api/stats")
                .param("puuid", "test-puuid")
                .param("region", "NA"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalGames").value(10))
            .andExpect(jsonPath("$.wins").value(6))
            .andExpect(jsonPath("$.winRate").value(60.0));
    }

    /** Verify that a custom count parameter is forwarded to the stats service. */
    @Test
    void getPlayerStats_withCustomCount_usesProvidedCount() throws Exception {
        PlayerStatsDto stats = new PlayerStatsDto(20, 12, 8, 60.0, 5.0, 3.0, 7.0, 4.0);
        when(statsService.calculateStats("test-puuid", RiotRegion.NA, 20)).thenReturn(stats);

        mockMvc.perform(get("/api/stats")
                .param("puuid", "test-puuid")
                .param("region", "NA")
                .param("count", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalGames").value(20));

        verify(statsService).calculateStats("test-puuid", RiotRegion.NA, 20);
    }

    /** Verify that a missing puuid parameter returns HTTP 400. */
    @Test
    void getPlayerStats_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/stats").param("region", "NA"))
            .andExpect(status().isBadRequest());
    }

    /** Verify that a missing region parameter returns HTTP 400. */
    @Test
    void getPlayerStats_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/stats").param("puuid", "test-puuid"))
            .andExpect(status().isBadRequest());
    }
}
