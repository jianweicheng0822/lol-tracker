package com.jw.backend;

import com.jw.backend.dto.GlobalChampionStatsDto;
import com.jw.backend.dto.GlobalOverviewDto;
import com.jw.backend.service.GlobalStatsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import com.jw.backend.security.JwtUtil;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GlobalStatsController.class)
@AutoConfigureMockMvc(addFilters = false)
class GlobalStatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private GlobalStatsService globalStatsService;

    @Test
    void getGlobalChampionStats_withoutQueueFilter_returnsOk() throws Exception {
        List<GlobalChampionStatsDto> stats = List.of(
                new GlobalChampionStatsDto("Ahri", 50, 30, 60.0, 12.5, 5.2, 3.1, 7.8, 3.45, 180.5, 15200.0, 11500.0),
                new GlobalChampionStatsDto("Zed", 30, 15, 50.0, 7.5, 8.1, 4.2, 5.3, 3.17, 200.3, 18500.0, 12300.0)
        );
        when(globalStatsService.getGlobalChampionStats(null)).thenReturn(stats);

        mockMvc.perform(get("/api/global/champions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].championName").value("Ahri"))
                .andExpect(jsonPath("$[0].games").value(50))
                .andExpect(jsonPath("$[0].winRate").value(60.0))
                .andExpect(jsonPath("$[0].pickRate").value(12.5))
                .andExpect(jsonPath("$[1].championName").value("Zed"));

        verify(globalStatsService).getGlobalChampionStats(null);
    }

    @Test
    void getGlobalChampionStats_withQueueFilter_passesQueueId() throws Exception {
        when(globalStatsService.getGlobalChampionStats(420)).thenReturn(List.of());

        mockMvc.perform(get("/api/global/champions").param("queueId", "420"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(globalStatsService).getGlobalChampionStats(420);
    }

    @Test
    void getOverview_returnsCorrectTotals() throws Exception {
        GlobalOverviewDto overview = new GlobalOverviewDto(400, 10, 85);
        when(globalStatsService.getOverviewStats()).thenReturn(overview);

        mockMvc.perform(get("/api/global/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMatches").value(400))
                .andExpect(jsonPath("$.totalPlayers").value(10))
                .andExpect(jsonPath("$.totalChampions").value(85));
    }
}
