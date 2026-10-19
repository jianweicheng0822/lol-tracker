/**
 * @file SummonerControllerTest.java
 * @description Unit tests for the summoner lookup controller endpoint.
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.PlayerTrackingService;
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

    @MockitoBean
    private PlayerTrackingService playerTrackingService;

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

    /**
     * Verify that the PUUID lookup (used when opening a profile from the leaderboard, home page or
     * favorites) returns the real profile icon instead of 0.
     */
    @Test
    void getSummonerByPuuid_returnsRealProfileIcon() throws Exception {
        when(riotApiService.getAccountByPuuid("abc123", RiotRegion.NA))
            .thenReturn("{\"puuid\":\"abc123\",\"gameName\":\"Doublelift\",\"tagLine\":\"NA1\"}");
        when(riotApiService.getSummonerByPuuid("abc123", RiotRegion.NA))
            .thenReturn("{\"profileIconId\":5367}");

        mockMvc.perform(
                get("/api/summoner/by-puuid")
                    .param("puuid", "abc123")
                    .param("region", "NA")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.puuid").value("abc123"))
            .andExpect(jsonPath("$.gameName").value("Doublelift"))
            .andExpect(jsonPath("$.tagLine").value("NA1"))
            .andExpect(jsonPath("$.profileIconId").value(5367));
    }

    /** Verify that the PUUID lookup records an LP snapshot and tracks the player, like the name lookup. */
    @Test
    void getSummonerByPuuid_capturesLpSnapshotAndTracksPlayer() throws Exception {
        when(riotApiService.getAccountByPuuid("abc123", RiotRegion.NA))
            .thenReturn("{\"puuid\":\"abc123\",\"gameName\":\"Doublelift\",\"tagLine\":\"NA1\"}");
        when(riotApiService.getSummonerByPuuid("abc123", RiotRegion.NA))
            .thenReturn("{\"profileIconId\":5367}");

        mockMvc.perform(
                get("/api/summoner/by-puuid")
                    .param("puuid", "abc123")
                    .param("region", "NA")
            )
            .andExpect(status().isOk());

        verify(lpTrackingService).captureSnapshot("abc123", RiotRegion.NA);
        verify(playerTrackingService).trackPlayer("abc123", "NA", "Doublelift", "NA1");
    }

    /** Verify that a missing PUUID returns HTTP 400. */
    @Test
    void getSummonerByPuuid_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/summoner/by-puuid")
                    .param("region", "NA")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that an empty name or tag is a 400 without calling Riot. */
    @Test
    void getSummoner_blankNameOrTag_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/summoner").param("gameName", " ").param("tag", "NA1").param("region", "NA"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/summoner").param("gameName", "Faker").param("tag", "").param("region", "NA"))
                .andExpect(status().isBadRequest());
        verify(riotApiService, never()).getAccountByRiotId(anyString(), anyString(), any());
    }

    /** Verify that a name with a slash is "not found" without calling Riot. */
    @Test
    void getSummoner_nameWithSlash_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/summoner").param("gameName", "../../etc").param("tag", "NA1").param("region", "NA"))
                .andExpect(status().isNotFound());
        verify(riotApiService, never()).getAccountByRiotId(anyString(), anyString(), any());
    }
}
