package com.jw.backend.metrics;

import com.jw.backend.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TrackController.class)
@AutoConfigureMockMvc(addFilters = false)
class TrackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UsageEventService usageEvents;

    @Test
    void pageView_withReferrer_recordsBoth() throws Exception {
        mockMvc.perform(post("/api/track").contentType(MediaType.APPLICATION_JSON)
                .content("{\"page\": \"home\", \"referrer\": \"news.ycombinator.com\"}"))
            .andExpect(status().isNoContent());

        verify(usageEvents).record(eq("page_view"), eq("home"), any());
        verify(usageEvents).record(eq("referral"), eq("news.ycombinator.com"), any());
    }

    @Test
    void invalidPage_recordsNothingButStillAnswers204() throws Exception {
        mockMvc.perform(post("/api/track").contentType(MediaType.APPLICATION_JSON)
                .content("{\"page\": \"<script>\"}"))
            .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/track").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isNoContent());

        verifyNoInteractions(usageEvents);
    }

    @Test
    void referrerHost_dropsOwnSiteAndJunk() {
        assertEquals("reddit.com", TrackController.referrerHost("www.Reddit.com", "loltracker.lol"));
        assertNull(TrackController.referrerHost("loltracker.lol", "loltracker.lol"));
        assertNull(TrackController.referrerHost("www.loltracker.lol", "loltracker.lol"));
        assertNull(TrackController.referrerHost("https://evil.com/path", "loltracker.lol"));
        assertNull(TrackController.referrerHost(null, "loltracker.lol"));
        assertNull(TrackController.referrerHost("", "loltracker.lol"));
    }
}
