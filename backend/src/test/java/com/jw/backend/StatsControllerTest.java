package com.jw.backend;

import com.jw.backend.dto.PlayerStatsDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.StatsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StatsController.class)
class StatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StatsService statsService;

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

    @Test
    void getPlayerStats_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/stats").param("region", "NA"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getPlayerStats_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/stats").param("puuid", "test-puuid"))
            .andExpect(status().isBadRequest());
    }
}
