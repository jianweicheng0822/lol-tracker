package com.jw.backend;

import com.jw.backend.dto.FeedbackDto;
import com.jw.backend.dto.FeedbackRequest;
import com.jw.backend.exception.RateLimitException;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.FeedbackService;
import com.jw.backend.service.RateLimitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FeedbackController.class)
@AutoConfigureMockMvc(addFilters = false)
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private FeedbackService feedbackService;

    @MockitoBean
    private RateLimitService rateLimitService;

    private static final String VALID = """
        {"type": "bug", "message": "The match list never loads", "email": "", "pageUrl": "/leaderboard"}
        """;

    @BeforeEach
    void setUp() {
        when(feedbackService.isAdmin("boss")).thenReturn(true);
    }

    @Test
    void submit_valid_savesWithUsernameAndUserAgent() throws Exception {
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON).content(VALID)
                .header("User-Agent", "TestBrowser/1.0")
                .principal(() -> "alice"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Thanks for the feedback!"));

        verify(rateLimitService).checkFeedbackRateLimit(anyString());
        verify(feedbackService).submit(any(FeedbackRequest.class), eq("alice"), eq("TestBrowser/1.0"));
    }

    @Test
    void submit_anonymous_savesWithoutUsername() throws Exception {
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON).content(VALID))
            .andExpect(status().isOk());

        verify(feedbackService).submit(any(FeedbackRequest.class), isNull(), any());
    }

    @Test
    void submit_honeypotFilled_answersOkButSavesNothing() throws Exception {
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"type": "bug", "message": "buy cheap stuff here", "website": "http://spam.example"}
                    """))
            .andExpect(status().isOk());

        verifyNoInteractions(rateLimitService);
        verify(feedbackService, never()).submit(any(), any(), any());
    }

    @Test
    void submit_invalid_returns400WithReason() throws Exception {
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"type": "bug", "message": "hi"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Please write at least 5 characters"));

        verify(feedbackService, never()).submit(any(), any(), any());
    }

    @Test
    void submit_rateLimited_returns429() throws Exception {
        doThrow(new RateLimitException("slow down")).when(rateLimitService).checkFeedbackRateLimit(anyString());

        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON).content(VALID))
            .andExpect(status().isTooManyRequests());

        verify(feedbackService, never()).submit(any(), any(), any());
    }

    @Test
    void status_tellsWhetherCallerIsAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/status").principal(() -> "boss"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.admin").value(true));
        mockMvc.perform(get("/api/admin/status").principal(() -> "alice"))
            .andExpect(jsonPath("$.admin").value(false));
        mockMvc.perform(get("/api/admin/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.admin").value(false));
    }

    @Test
    void list_notLoggedIn_returns404() throws Exception {
        mockMvc.perform(get("/api/admin/feedback"))
            .andExpect(status().isNotFound());

        verify(feedbackService, never()).latest();
    }

    @Test
    void list_notAdmin_returns404() throws Exception {
        mockMvc.perform(get("/api/admin/feedback").principal(() -> "alice"))
            .andExpect(status().isNotFound());

        verify(feedbackService, never()).latest();
    }

    @Test
    void list_admin_returnsEntries() throws Exception {
        when(feedbackService.latest()).thenReturn(List.of(
            new FeedbackDto(7L, "idea", "Add dark mode", null, "alice", "/", "UA", false, Instant.now())));

        mockMvc.perform(get("/api/admin/feedback").principal(() -> "boss"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(7))
            .andExpect(jsonPath("$[0].message").value("Add dark mode"));
    }

    @Test
    void setResolved_admin_updatesEntry() throws Exception {
        when(feedbackService.setResolved(7L, true)).thenReturn(Optional.of(
            new FeedbackDto(7L, "idea", "Add dark mode", null, null, "/", "UA", true, Instant.now())));

        mockMvc.perform(put("/api/admin/feedback/7").principal(() -> "boss")
                .contentType(MediaType.APPLICATION_JSON).content("{\"resolved\": true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.resolved").value(true));
    }

    @Test
    void setResolved_unknownId_returns404() throws Exception {
        when(feedbackService.setResolved(99L, true)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/admin/feedback/99").principal(() -> "boss")
                .contentType(MediaType.APPLICATION_JSON).content("{\"resolved\": true}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void setResolved_missingField_returns400() throws Exception {
        mockMvc.perform(put("/api/admin/feedback/7").principal(() -> "boss")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void setResolved_notAdmin_returns404() throws Exception {
        mockMvc.perform(put("/api/admin/feedback/7").principal(() -> "alice")
                .contentType(MediaType.APPLICATION_JSON).content("{\"resolved\": true}"))
            .andExpect(status().isNotFound());

        verify(feedbackService, never()).setResolved(anyLong(), anyBoolean());
    }
}
