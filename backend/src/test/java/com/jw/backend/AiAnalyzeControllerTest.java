/**
 * @file AiAnalyzeControllerTest.java
 * @description Unit tests for the AI analysis controller endpoints.
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.dto.AiChatResponse;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.AiAnalyzeService;
import com.jw.backend.service.SubscriptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import reactor.core.publisher.Flux;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the {@link AiAnalyzeController} request handling, subscription gating,
 * and input validation for both synchronous and streaming analysis endpoints.
 */
@WebMvcTest(AiAnalyzeController.class)
@AutoConfigureMockMvc(addFilters = false)
class AiAnalyzeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private AiAnalyzeService aiAnalyzeService;

    @MockitoBean
    private SubscriptionService subscriptionService;

    private static final String VALID_REQUEST = """
        {
            "matchData": {
                "champion": "Ahri", "role": "MID", "rank": "GOLD I",
                "kills": 10, "deaths": 2, "assists": 8,
                "cs": 200, "gold": 15000, "damage": 20000, "visionScore": 30,
                "gameDurationSec": 1800, "win": true,
                "items": [], "teamComp": [], "enemyComp": []
            },
            "messages": [{"role": "user", "content": "How did I do?"}]
        }
        """;

    /** Verify that a PRO-tier user receives a successful analysis response. */
    @Test
    void analyze_whenProUser_returnsOk() throws Exception {
        when(subscriptionService.hasAiAccess(any())).thenReturn(true);
        when(aiAnalyzeService.analyze(any())).thenReturn(
            new AiChatResponse("Great game!", "gpt-4o-mini", 100)
        );

        mockMvc.perform(post("/api/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_REQUEST))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reply").value("Great game!"));
    }

    /** Verify that a free-tier user is denied access with HTTP 403. */
    @Test
    void analyze_whenFreeUser_returnsForbidden() throws Exception {
        when(subscriptionService.hasAiAccess(any())).thenReturn(false);

        mockMvc.perform(post("/api/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_REQUEST))
            .andExpect(status().isForbidden());
    }

    /** Verify that a request with null matchData returns HTTP 400. */
    @Test
    void analyze_withMissingMatchData_returnsBadRequest() throws Exception {
        when(subscriptionService.hasAiAccess(any())).thenReturn(true);

        String noMatchData = """
            {"matchData": null, "messages": [{"role": "user", "content": "hi"}]}
            """;

        mockMvc.perform(post("/api/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .content(noMatchData))
            .andExpect(status().isBadRequest());
    }

    /** Verify that a request with null messages returns HTTP 400. */
    @Test
    void analyze_withMissingMessages_returnsBadRequest() throws Exception {
        when(subscriptionService.hasAiAccess(any())).thenReturn(true);

        String noMessages = """
            {
                "matchData": {
                    "champion": "Ahri", "role": "MID", "rank": "GOLD I",
                    "kills": 10, "deaths": 2, "assists": 8,
                    "cs": 200, "gold": 15000, "damage": 20000, "visionScore": 30,
                    "gameDurationSec": 1800, "win": true,
                    "items": [], "teamComp": [], "enemyComp": []
                },
                "messages": null
            }
            """;

        mockMvc.perform(post("/api/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .content(noMessages))
            .andExpect(status().isBadRequest());
    }

    /** Verify that the streaming endpoint returns an error event for free-tier users. */
    @Test
    void analyzeStream_whenFreeUser_returnsError() throws Exception {
        when(subscriptionService.hasAiAccess(any())).thenReturn(false);

        mockMvc.perform(post("/api/analyze/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM_VALUE)
                .content(VALID_REQUEST))
            .andExpect(status().isOk())
            .andExpect(content().string(org.hamcrest.Matchers.containsString("PRO subscription")));
    }

    /** Verify that the streaming endpoint handles missing match data gracefully. */
    @Test
    void analyzeStream_withMissingData_returnsOk() throws Exception {
        when(subscriptionService.hasAiAccess(any())).thenReturn(true);

        String noMatchData = """
            {"matchData": null, "messages": [{"role": "user", "content": "hi"}]}
            """;

        mockMvc.perform(post("/api/analyze/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM_VALUE)
                .content(noMatchData))
            .andExpect(status().isOk());
    }

    /** Verify that a PRO-tier user receives a streamed response successfully. */
    @Test
    void analyzeStream_whenProUser_returnsStream() throws Exception {
        when(subscriptionService.hasAiAccess(any())).thenReturn(true);
        when(aiAnalyzeService.analyzeStream(any())).thenReturn(Flux.just("Hello", " world"));

        mockMvc.perform(post("/api/analyze/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM_VALUE)
                .content(VALID_REQUEST))
            .andExpect(status().isOk());
    }
}
