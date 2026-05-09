package com.jw.backend;

import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.RankedService;
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

@WebMvcTest(RankedController.class)
@AutoConfigureMockMvc(addFilters = false)
class RankedControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private RankedService rankedService;

    @Test
    void getRankedInfo_withValidParams_returnsOk() throws Exception {
        List<RankedEntryDto> entries = List.of(
            new RankedEntryDto("RANKED_SOLO_5x5", "GOLD", "I", 75, 100, 80)
        );
        when(rankedService.getRankedInfo("test-puuid", RiotRegion.NA)).thenReturn(entries);

        mockMvc.perform(get("/api/ranked")
                .param("puuid", "test-puuid")
                .param("region", "NA"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].queueType").value("RANKED_SOLO_5x5"))
            .andExpect(jsonPath("$[0].tier").value("GOLD"))
            .andExpect(jsonPath("$[0].rank").value("I"))
            .andExpect(jsonPath("$[0].leaguePoints").value(75));
    }

    @Test
    void getRankedInfo_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/ranked").param("region", "NA"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getRankedInfo_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/ranked").param("puuid", "test-puuid"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void getRankedInfo_invalidRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/ranked")
                .param("puuid", "test-puuid")
                .param("region", "INVALID"))
            .andExpect(status().isBadRequest());
    }
}
