package com.jw.backend.integration;

import com.jw.backend.repository.FeedbackRepository;
import com.jw.backend.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Submit feedback, read it as an admin and mark it resolved, against a real PostgreSQL schema. */
@TestPropertySource(properties = "admin.usernames=feedbackadmin")
class FeedbackIntegrationTest extends BaseIntegrationSupport {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @BeforeEach
    void clean() {
        feedbackRepository.deleteAll();
    }

    @Test
    void submitListResolve_roundTrip() throws Exception {
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "IntegrationTest")
                .content("""
                    {"type": "bug", "message": "Leaderboard shows a blank page", "email": "me@example.com", "pageUrl": "/leaderboard"}
                    """))
            .andExpect(status().isOk());

        String admin = "Bearer " + jwtUtil.generateToken("feedbackadmin");
        String body = mockMvc.perform(get("/api/admin/feedback").header("Authorization", admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].type").value("bug"))
            .andExpect(jsonPath("$[0].email").value("me@example.com"))
            .andExpect(jsonPath("$[0].userAgent").value("IntegrationTest"))
            .andExpect(jsonPath("$[0].resolved").value(false))
            .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(body).get(0).get("id").asLong();

        mockMvc.perform(put("/api/admin/feedback/" + id).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"resolved\": true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.resolved").value(true));
        assertTrue(feedbackRepository.findById(id).orElseThrow().isResolved());
    }

    @Test
    void nonAdmin_cannotRead() throws Exception {
        String user = "Bearer " + jwtUtil.generateToken("someoneelse");
        mockMvc.perform(get("/api/admin/feedback").header("Authorization", user))
            .andExpect(status().isNotFound());
    }

    @Test
    void sixthMessageInAnHour_isRateLimited() throws Exception {
        String valid = """
            {"type": "other", "message": "Just saying hello"}
            """;
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON).content(valid))
            .andExpect(status().isTooManyRequests());
        assertEquals(5, feedbackRepository.count());
    }
}
