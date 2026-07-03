package com.jw.backend;

import com.jw.backend.dto.LeaderboardEntryDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.LeaderboardService;
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

@WebMvcTest(LeaderboardController.class)
@AutoConfigureMockMvc(addFilters = false)
class LeaderboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private LeaderboardService leaderboardService;

    @Test
    void getLeaderboard_withValidParams_returnsOk() throws Exception {
        List<LeaderboardEntryDto> entries = List.of(
            new LeaderboardEntryDto("Faker", "CHALLENGER", "I", 1500, 200, 80, 71.4),
            new LeaderboardEntryDto("Zeus", "CHALLENGER", "I", 1200, 180, 90, 66.7)
        );
        when(leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.KR)).thenReturn(entries);

        mockMvc.perform(get("/api/leaderboard")
                .param("region", "KR")
                .param("queue", "RANKED_SOLO_5x5")
                .param("tier", "challenger"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].summonerName").value("Faker"))
            .andExpect(jsonPath("$[0].tier").value("CHALLENGER"))
            .andExpect(jsonPath("$[0].leaguePoints").value(1500))
            .andExpect(jsonPath("$[0].winRate").value(71.4))
            .andExpect(jsonPath("$[1].summonerName").value("Zeus"));
    }

    @Test
    void getLeaderboard_withDefaultParams_usesDefaults() throws Exception {
        when(leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA))
            .thenReturn(List.of());

        mockMvc.perform(get("/api/leaderboard"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));

        verify(leaderboardService).getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);
    }

    @Test
    void getLeaderboard_withGrandmaster_returnsOk() throws Exception {
        when(leaderboardService.getLeaderboard("grandmaster", "RANKED_SOLO_5x5", RiotRegion.NA))
            .thenReturn(List.of(new LeaderboardEntryDto("GM Player", "GRANDMASTER", "I", 600, 100, 50, 66.7)));

        mockMvc.perform(get("/api/leaderboard")
                .param("tier", "grandmaster"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].tier").value("GRANDMASTER"));
    }

    @Test
    void getLeaderboard_withMaster_returnsOk() throws Exception {
        when(leaderboardService.getLeaderboard("master", "RANKED_SOLO_5x5", RiotRegion.EUW))
            .thenReturn(List.of());

        mockMvc.perform(get("/api/leaderboard")
                .param("region", "EUW")
                .param("tier", "master"))
            .andExpect(status().isOk());
    }

    @Test
    void getLeaderboard_withInvalidTier_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/leaderboard")
                .param("tier", "diamond"))
            .andExpect(status().isBadRequest());

        verify(leaderboardService, never()).getLeaderboard(anyString(), anyString(), any());
    }

    @Test
    void getLeaderboard_withInvalidRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/leaderboard")
                .param("region", "INVALID"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getLeaderboard_tierIsCaseInsensitive() throws Exception {
        when(leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA))
            .thenReturn(List.of());

        mockMvc.perform(get("/api/leaderboard")
                .param("tier", "CHALLENGER"))
            .andExpect(status().isOk());

        verify(leaderboardService).getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);
    }
}
