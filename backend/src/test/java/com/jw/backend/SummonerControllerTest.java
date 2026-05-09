package com.jw.backend;

import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.RiotApiService;
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

@WebMvcTest(SummonerController.class)
@AutoConfigureMockMvc(addFilters = false)
class SummonerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private RiotApiService riotApiService;

    @MockitoBean
    private LpTrackingService lpTrackingService;

    // =====================================================
    // TEST 1: Valid request returns 200 OK with JSON
    // =====================================================
    @Test
    void getSummoner_withValidParams_returnsOk() throws Exception {
        // ARRANGE - Mock both Riot API calls that SummonerController chains together:
        // 1. Account-v1 returns puuid + gameName + tagLine
        // 2. Summoner-v4 returns profileIconId (looked up by puuid from step 1)
        String fakeAccountJson = "{\"puuid\":\"abc123\",\"gameName\":\"Faker\",\"tagLine\":\"KR1\"}";
        String fakeSummonerJson = "{\"profileIconId\":4567}";

        when(riotApiService.getAccountByRiotId("Faker", "KR1", RiotRegion.KR))
            .thenReturn(fakeAccountJson);
        when(riotApiService.getSummonerByPuuid("abc123", RiotRegion.KR))
            .thenReturn(fakeSummonerJson);

        // ACT & ASSERT — the controller merges both responses into one JSON
        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    .param("tag", "KR1")
                    .param("region", "KR")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.puuid").value("abc123"))
            .andExpect(jsonPath("$.gameName").value("Faker"))
            .andExpect(jsonPath("$.profileIconId").value(4567));
    }

    // =====================================================
    // TEST 2: Missing gameName returns 400 Bad Request
    // =====================================================
    @Test
    void getSummoner_missingGameName_returnsBadRequest() throws Exception {
        // No ARRANGE needed - we expect this to fail before calling the service

        mockMvc.perform(
                get("/api/summoner")
                    // gameName is MISSING!
                    .param("tag", "KR1")
                    .param("region", "KR")
            )
            // Should return 400 Bad Request because gameName is required
            .andExpect(status().isBadRequest());
    }

    // =====================================================
    // TEST 3: Missing tag returns 400 Bad Request
    // =====================================================
    @Test
    void getSummoner_missingTag_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    // tag is MISSING!
                    .param("region", "KR")
            )
            .andExpect(status().isBadRequest());
    }

    // =====================================================
    // TEST 4: Missing region returns 400 Bad Request
    // =====================================================
    @Test
    void getSummoner_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    .param("tag", "KR1")
                    // region is MISSING!
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    void getSummoner_callsServiceWithCorrectParameters() throws Exception {
        // ARRANGE - Mock the full call chain so the controller completes successfully
        when(riotApiService.getAccountByRiotId(anyString(), anyString(), any()))
            .thenReturn("{\"puuid\":\"test-puuid\"}");
        when(riotApiService.getSummonerByPuuid(anyString(), any()))
            .thenReturn("{\"profileIconId\":0}");

        // ACT
        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    .param("tag", "KR1")
                    .param("region", "KR")
            );

        // ASSERT — verify both Riot API calls were made with correct params
        verify(riotApiService, times(1))
            .getAccountByRiotId("Faker", "KR1", RiotRegion.KR);
        verify(riotApiService, times(1))
            .getSummonerByPuuid("test-puuid", RiotRegion.KR);
    }
}
