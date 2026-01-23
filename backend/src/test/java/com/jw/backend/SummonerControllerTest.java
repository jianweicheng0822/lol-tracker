package com.jw.backend;

import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.RiotApiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// =====================================================
// @WebMvcTest - VERY IMPORTANT!
// This tells Spring to only load SummonerController
// Without this, the test won't work!
// =====================================================
@WebMvcTest(SummonerController.class)
class SummonerControllerTest {

    // =====================================================
    // @Autowired MockMvc
    // MockMvc lets us simulate HTTP requests
    // We don't need a real server running
    // =====================================================
    @Autowired
    private MockMvc mockMvc;

    // =====================================================
    // @MockitoBean (replaces old @MockBean in Spring Boot 3.4+)
    // Creates a FAKE RiotApiService
    // The controller will use this fake instead of the real one
    // This way we don't call the real Riot API during tests
    // =====================================================
    @MockitoBean
    private RiotApiService riotApiService;

    // =====================================================
    // TEST 1: Valid request returns 200 OK with JSON
    // =====================================================
    @Test
    void getSummoner_withValidParams_returnsOk() throws Exception {
        // ARRANGE - Tell the mock what to return when called
        // This is FAKE data - we're not calling the real Riot API
        String fakeResponse = "{\"puuid\":\"abc123\",\"gameName\":\"Faker\",\"tagLine\":\"KR1\"}";

        // when(X).thenReturn(Y) means:
        // "When someone calls X, return Y instead of doing the real thing"
        when(riotApiService.getAccountByRiotId("Faker", "KR1", RiotRegion.KR))
            .thenReturn(fakeResponse);

        // ACT & ASSERT - Make the HTTP request and check the response
        mockMvc.perform(
                // Create a GET request to /api/summoner
                get("/api/summoner")
                    .param("gameName", "Faker")   // ?gameName=Faker
                    .param("tag", "KR1")          // &tag=KR1
                    .param("region", "KR")        // &region=KR
            )
            // Check that status code is 200 OK
            .andExpect(status().isOk())
            // Check that response body matches our fake JSON
            .andExpect(content().json(fakeResponse));
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

    // =====================================================
    // TEST 5: Verify service is called with correct params
    // =====================================================
    @Test
    void getSummoner_callsServiceWithCorrectParameters() throws Exception {
        // ARRANGE - Set up mock to return something (we don't care what)
        // anyString() and any() are "matchers" - they match any value
        when(riotApiService.getAccountByRiotId(anyString(), anyString(), any()))
            .thenReturn("{}");

        // ACT - Make the request
        mockMvc.perform(
                get("/api/summoner")
                    .param("gameName", "Faker")
                    .param("tag", "KR1")
                    .param("region", "KR")
            );

        // ASSERT - Verify the service was called exactly once with these params
        // verify() checks: "Was this method called?"
        // times(1) means: "Exactly 1 time"
        verify(riotApiService, times(1))
            .getAccountByRiotId("Faker", "KR1", RiotRegion.KR);
    }
}
