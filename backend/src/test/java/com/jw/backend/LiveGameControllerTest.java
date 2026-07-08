package com.jw.backend;

import com.jw.backend.dto.LiveGameDto;
import com.jw.backend.dto.LiveGameParticipantDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.LiveGameService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LiveGameController.class)
@AutoConfigureMockMvc(addFilters = false)
class LiveGameControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private LiveGameService liveGameService;

    @Test
    void getLiveGame_inGame_returnsOk() throws Exception {
        LiveGameDto dto = new LiveGameDto(
                123456L, "CLASSIC", System.currentTimeMillis(), 300,
                List.of(
                        new LiveGameParticipantDto("puuid-1", "Player1", "NA1", 103, 100, 4, 14,
                                "GOLD", "II", 45, 50, 40, 55.6),
                        new LiveGameParticipantDto("puuid-2", "Player2", "EUW", 24, 200, 4, 12,
                                null, null, 0, 0, 0, 0)
                )
        );
        when(liveGameService.getActiveGame("test-puuid", RiotRegion.NA)).thenReturn(Optional.of(dto));

        mockMvc.perform(get("/api/live-game")
                        .param("puuid", "test-puuid")
                        .param("region", "NA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameId").value(123456))
                .andExpect(jsonPath("$.gameMode").value("CLASSIC"))
                .andExpect(jsonPath("$.participants.length()").value(2))
                .andExpect(jsonPath("$.participants[0].gameName").value("Player1"))
                .andExpect(jsonPath("$.participants[0].tier").value("GOLD"))
                .andExpect(jsonPath("$.participants[1].tier").doesNotExist());
    }

    @Test
    void getLiveGame_notInGame_returns404() throws Exception {
        when(liveGameService.getActiveGame("test-puuid", RiotRegion.NA)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/live-game")
                        .param("puuid", "test-puuid")
                        .param("region", "NA"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Player is not currently in a game"));
    }

    @Test
    void getLiveGame_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/live-game")
                        .param("region", "NA"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getLiveGame_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/live-game")
                        .param("puuid", "test-puuid"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getLiveGame_invalidRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/live-game")
                        .param("puuid", "test-puuid")
                        .param("region", "INVALID"))
                .andExpect(status().isBadRequest());
    }
}
