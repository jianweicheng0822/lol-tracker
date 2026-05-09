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

    // =====================================================
    // TESTS FOR: GET /api/matches/recent
    // =====================================================

    @Test
    void getRecentMatches_withValidParams_returnsOk() throws Exception {
        // ARRANGE
        String fakeMatchIds = "[\"NA1_123\", \"NA1_456\", \"NA1_789\"]";

        when(riotApiService.getRecentMatchIds("test-puuid", RiotRegion.NA, 10))
            .thenReturn(fakeMatchIds);

        // ACT & ASSERT
        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
                    .param("count", "10")
            )
            .andExpect(status().isOk())
            .andExpect(content().json(fakeMatchIds));
    }

    @Test
    void getRecentMatches_usesDefaultCount_whenCountNotProvided() throws Exception {
        // ARRANGE - default count is 10
        when(riotApiService.getRecentMatchIds("test-puuid", RiotRegion.NA, 10))
            .thenReturn("[]");

        // ACT - no count parameter provided
        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
                    // count is NOT provided - should default to 10
            )
            .andExpect(status().isOk());

        // ASSERT - verify service was called with default count (10)
        verify(riotApiService, times(1))
            .getRecentMatchIds("test-puuid", RiotRegion.NA, 10);
    }

    @Test
    void getRecentMatches_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/recent")
                    // puuid is MISSING!
                    .param("region", "NA")
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    void getRecentMatches_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
                    // region is MISSING!
            )
            .andExpect(status().isBadRequest());
    }

    // =====================================================
    // TESTS FOR: GET /api/matches/detail
    // =====================================================

    @Test
    void getMatchDetail_withValidParams_returnsOk() throws Exception {
        // ARRANGE
        String fakeMatchDetail = "{\"matchId\":\"NA1_123\",\"info\":{}}";

        when(riotApiService.getMatchDetail("NA1_123", RiotRegion.NA))
            .thenReturn(fakeMatchDetail);

        // ACT & ASSERT
        mockMvc.perform(
                get("/api/matches/detail")
                    .param("matchId", "NA1_123")
                    .param("region", "NA")
            )
            .andExpect(status().isOk())
            .andExpect(content().json(fakeMatchDetail));
    }

    @Test
    void getMatchDetail_missingMatchId_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/detail")
                    // matchId is MISSING!
                    .param("region", "NA")
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    void getMatchDetail_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/detail")
                    .param("matchId", "NA1_123")
                    // region is MISSING!
            )
            .andExpect(status().isBadRequest());
    }

    // =====================================================
    // TESTS FOR: GET /api/matches/summary
    // =====================================================

    @Test
    void getMatchSummaries_withValidParams_returnsOk() throws Exception {
        // ARRANGE - create fake match summaries
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

        // ACT & ASSERT
        mockMvc.perform(
                get("/api/matches/summary")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
                    .param("count", "3")
            )
            .andExpect(status().isOk())
            // Check that response is a JSON array with 2 items
            .andExpect(jsonPath("$.length()").value(2))
            // Check first match
            .andExpect(jsonPath("$[0].matchId").value("NA1_123"))
            .andExpect(jsonPath("$[0].championName").value("Ahri"))
            .andExpect(jsonPath("$[0].kills").value(10))
            .andExpect(jsonPath("$[0].deaths").value(2))
            .andExpect(jsonPath("$[0].assists").value(8))
            .andExpect(jsonPath("$[0].win").value(true))
            // Check second match
            .andExpect(jsonPath("$[1].matchId").value("NA1_456"))
            .andExpect(jsonPath("$[1].championName").value("Zed"))
            .andExpect(jsonPath("$[1].win").value(false));
    }

    @Test
    void getMatchSummaries_usesDefaultCount_whenCountNotProvided() throws Exception {
        // ARRANGE - default count is 3, default start is 0
        when(riotApiService.getRecentMatchSummaries("test-puuid", RiotRegion.NA, 3, 0))
            .thenReturn(List.of());

        // ACT - no count parameter provided
        mockMvc.perform(
                get("/api/matches/summary")
                    .param("puuid", "test-puuid")
                    .param("region", "NA")
                    // count is NOT provided - should default to 3
            )
            .andExpect(status().isOk());

        // ASSERT - verify service was called with default count (3) and start (0)
        verify(riotApiService, times(1))
            .getRecentMatchSummaries("test-puuid", RiotRegion.NA, 3, 0);
    }

    @Test
    void getMatchSummaries_missingPuuid_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/summary")
                    // puuid is MISSING!
                    .param("region", "NA")
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    void getMatchSummaries_missingRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/summary")
                    .param("puuid", "test-puuid")
                    // region is MISSING!
            )
            .andExpect(status().isBadRequest());
    }

    // =====================================================
    // TEST: Invalid region returns 400
    // =====================================================

    @Test
    void getRecentMatches_invalidRegion_returnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/matches/recent")
                    .param("puuid", "test-puuid")
                    .param("region", "INVALID_REGION")  // Not a valid RiotRegion
            )
            .andExpect(status().isBadRequest());
    }
}
