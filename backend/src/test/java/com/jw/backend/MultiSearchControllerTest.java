package com.jw.backend;

import com.jw.backend.dto.MultiSearchPlayerDto;
import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.MultiSearchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MultiSearchController.class)
@AutoConfigureMockMvc(addFilters = false)
class MultiSearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private MultiSearchService multiSearchService;

    @Test
    void multiSearch_validRequest_returnsOk() throws Exception {
        List<MultiSearchPlayerDto> results = List.of(
                new MultiSearchPlayerDto("Player1", "NA1", "puuid-1", 100,
                        List.of(new RankedEntryDto("RANKED_SOLO_5x5", "GOLD", "II", 45, 50, 40)), null),
                new MultiSearchPlayerDto("Player2", "EUW", "puuid-2", 200,
                        List.of(), null)
        );
        when(multiSearchService.lookup(anyList(), eq(RiotRegion.NA))).thenReturn(results);

        mockMvc.perform(post("/api/multi-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"players": ["Player1#NA1", "Player2#EUW"], "region": "NA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].gameName").value("Player1"))
                .andExpect(jsonPath("$[0].puuid").value("puuid-1"))
                .andExpect(jsonPath("$[0].rankedEntries[0].tier").value("GOLD"))
                .andExpect(jsonPath("$[1].gameName").value("Player2"));
    }

    @Test
    void multiSearch_emptyList_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/multi-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"players": [], "region": "NA"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Player list must not be empty"));
    }

    @Test
    void multiSearch_moreThanFivePlayers_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/multi-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"players": ["A#1","B#2","C#3","D#4","E#5","F#6"], "region": "NA"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Maximum 5 players allowed"));
    }

    @Test
    void multiSearch_malformedName_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/multi-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"players": ["PlayerNoTag"], "region": "NA"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void multiSearch_partialFailure_returnsOkWithErrors() throws Exception {
        List<MultiSearchPlayerDto> results = List.of(
                new MultiSearchPlayerDto("Player1", "NA1", "puuid-1", 100, List.of(), null),
                new MultiSearchPlayerDto("Unknown", "TAG", null, 0, List.of(), "Player not found")
        );
        when(multiSearchService.lookup(anyList(), eq(RiotRegion.NA))).thenReturn(results);

        mockMvc.perform(post("/api/multi-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"players": ["Player1#NA1", "Unknown#TAG"], "region": "NA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].error").doesNotExist())
                .andExpect(jsonPath("$[1].error").value("Player not found"));
    }

    @Test
    void multiSearch_invalidRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/multi-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"players": ["Player1#NA1"], "region": "INVALID"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }
}
