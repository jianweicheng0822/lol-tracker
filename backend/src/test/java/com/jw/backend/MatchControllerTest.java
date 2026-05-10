/**
 * @file MatchControllerTest.java
 * @description Unit tests for the match history controller endpoints.
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.entity.AppUser;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.MatchHistoryService;
import com.jw.backend.service.RateLimitService;
import com.jw.backend.service.RiotApiService;
import com.jw.backend.service.SubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the {@link MatchController} for fetching recent match IDs, match details,
 * and match summaries, including parameter validation and default value handling.
 */
@WebMvcTest(MatchController.class)
@AutoConfigureMockMvc(addFilters = false)
class MatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private RiotApiService riotApiService;

    @MockitoBean
    private MatchHistoryService matchHistoryService;

    @MockitoBean
    private SubscriptionService subscriptionService;

    @MockitoBean
    private RateLimitService rateLimitService;

    @BeforeEach
    void setUp() {
        AppUser freeUser = new AppUser();
        when(subscriptionService.getOrCreateUser(any())).thenReturn(freeUser);
        when(subscriptionService.getMaxMatchCount(any())).thenReturn(20);
    }

    /** Verify that valid puuid and region parameters return match IDs successfully. */
    @Test
    void getRecentMatches_withValidParams_returnsOk() throws Exception {
        String fakeMatchIds = "[\"NA1_123\", \"NA1_456\", \"NA1_789\"]";

        when(riotApiService.getRecentMatchIds("test-puuid", RiotRegion.NA, 10))
            .thenReturn(fakeMatchIds);

        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
                    .param("count", "10")
            )
            .andExpect(status().isOk())
            .andExpect(content().json(fakeMatchIds));
    }

    /** Verify that the default count of 10 is used when count is not provided. */
    @Test
    void getRecentMatches_usesDefaultCount_whenCountNotProvided() throws Exception {
        when(riotApiService.getRecentMatchIds("test-puuid", RiotRegion.NA, 10))
            .thenReturn("[]");

        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
            )
            .andExpect(status().isOk());

        verify(riotApiService, times(1))
            .getRecentMatchIds("test-puuid", RiotRegion.NA, 10);
    }

    /** Verify that a missing puuid parameter returns HTTP 400. */
    @Test
    void getRecentMatches_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/recent")
                    .param("region", "NA")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that a missing region parameter returns HTTP 400. */
    @Test
    void getRecentMatches_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that valid matchId and region return match detail JSON. */
    @Test
    void getMatchDetail_withValidParams_returnsOk() throws Exception {
        String fakeMatchDetail = "{\"matchId\":\"NA1_123\",\"info\":{}}";

        when(riotApiService.getMatchDetail("NA1_123", RiotRegion.NA))
            .thenReturn(fakeMatchDetail);

        mockMvc.perform(
                get("/api/matches/detail")
                    .param("matchId", "NA1_123")
                    .param("region", "NA")
            )
            .andExpect(status().isOk())
            .andExpect(content().json(fakeMatchDetail));
    }

    /** Verify that a missing matchId parameter returns HTTP 400. */
    @Test
    void getMatchDetail_missingMatchId_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/detail")
                    .param("region", "NA")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that a missing region parameter for match detail returns HTTP 400. */
    @Test
    void getMatchDetail_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/detail")
                    .param("matchId", "NA1_123")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that match summaries are returned with correct structure and values. */
    @Test
    void getMatchSummaries_withValidParams_returnsOk() throws Exception {
        List<MatchSummaryDto> fakeSummaries = List.of(
            new MatchSummaryDto("NA1_123", "Ahri", 10, 2, 8, true, 1800L, 1700000000000L,
                18, 4, 14, new int[]{1001,1002,1003,0,0,0,3340}, 150, 30, 420, 30, List.of(), List.of(),
                8005, 8200, new int[]{0,0,0,0}, 0, 15000, 12000),
            new MatchSummaryDto("NA1_456", "Zed", 5, 5, 3, false, 2100L, 1700000100000L,
                15, 4, 14, new int[]{2001,2002,0,0,0,0,3340}, 120, 20, 420, 25, List.of(), List.of(),
                8112, 8300, new int[]{0,0,0,0}, 0, 12000, 9500)
        );

        when(riotApiService.getRecentMatchSummaries("test-puuid", RiotRegion.NA, 3, 0))
            .thenReturn(fakeSummaries);

        mockMvc.perform(
                get("/api/matches/summary")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
                    .param("count", "3")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].matchId").value("NA1_123"))
            .andExpect(jsonPath("$[0].championName").value("Ahri"))
            .andExpect(jsonPath("$[0].kills").value(10))
            .andExpect(jsonPath("$[0].deaths").value(2))
            .andExpect(jsonPath("$[0].assists").value(8))
            .andExpect(jsonPath("$[0].win").value(true))
            .andExpect(jsonPath("$[1].matchId").value("NA1_456"))
            .andExpect(jsonPath("$[1].championName").value("Zed"))
            .andExpect(jsonPath("$[1].win").value(false));
    }

    /** Verify that the default count of 3 is used for summaries when count is omitted. */
    @Test
    void getMatchSummaries_usesDefaultCount_whenCountNotProvided() throws Exception {
        when(riotApiService.getRecentMatchSummaries("test-puuid", RiotRegion.NA, 3, 0))
            .thenReturn(List.of());

        mockMvc.perform(
                get("/api/matches/summary")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
            )
            .andExpect(status().isOk());

        verify(riotApiService, times(1))
            .getRecentMatchSummaries("test-puuid", RiotRegion.NA, 3, 0);
    }

    /** Verify that a missing puuid for summaries returns HTTP 400. */
    @Test
    void getMatchSummaries_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/summary")
                    .param("region", "NA")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that a missing region for summaries returns HTTP 400. */
    @Test
    void getMatchSummaries_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/summary")
                    .param("puuid", "test-puuid")
            )
            .andExpect(status().isBadRequest());
    }

    /** Verify that an invalid region string returns HTTP 400. */
    @Test
    void getRecentMatches_invalidRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
                    .param("region", "INVALID_REGION")
            )
            .andExpect(status().isBadRequest());
    }
}
