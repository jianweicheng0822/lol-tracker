/**
 * @file SummonerControllerTest.java
 * @description Unit tests for the summoner lookup controller endpoint.
 * @module backend.test
 */
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

/**
 * Validate the {@link SummonerController} for resolving summoner profiles via
 * Riot ID lookup, including parameter validation and service interaction verification.
 */
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

    /** Verify that a valid gameName, tag, and region return a merged summoner profile. */
    @Test
    void getSummoner_withValidParams_returnsOk() throws Exception {
        String fakeAccountJson = "{\"puuid\":\"abc123\",\"gameName\":\"Faker\",\"tagLine\":\"KR1\"}";
        String fakeSummonerJson = "{\"profileIconId\":4567}";

        when(riotApiService.getAccountByRiotId("Faker", "KR1", RiotRegion.KR))
            .thenReturn(fakeAccountJson);
        when(riotApiService.getSummonerByPuuid("abc123", RiotRegion.KR))
            .thenReturn(fakeSummonerJson);

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

    /** Verify that a missing gameName parameter returns HTTP 400. */
    @Test
    void getSummoner_missingGameName_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/summoner")
                    .param("tag", "KR1")
                    .param("region", "KR")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that a missing tag parameter returns HTTP 400. */
    @Test
    void getSummoner_missingTag_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    .param("region", "KR")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that a missing region parameter returns HTTP 400. */
    @Test
    void getSummoner_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    .param("tag", "KR1")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that the controller invokes both Riot API calls with exact parameters. */
    @Test
    void getSummoner_callsServiceWithCorrectParameters() throws Exception {
        when(riotApiService.getAccountByRiotId(anyString(), anyString(), any()))
            .thenReturn("{\"puuid\":\"test-puuid\"}");
        when(riotApiService.getSummonerByPuuid(anyString(), any()))
            .thenReturn("{\"profileIconId\":0}");

        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    .param("tag", "KR1")
                    .param("region", "KR")
            );

        verify(riotApiService, times(1))
            .getAccountByRiotId("Faker", "KR1", RiotRegion.KR);
        verify(riotApiService, times(1))
            .getSummonerByPuuid("test-puuid", RiotRegion.KR);
    }
}
