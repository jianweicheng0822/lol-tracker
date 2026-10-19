/**
 * @file SpaForwardingControllerTest.java
 * @description Unit tests for the SPA forwarding controller that serves index.html.
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate that the {@link SpaForwardingController} correctly forwards non-API
 * routes to /index.html for single-page application client-side routing.
 */
@WebMvcTest(SpaForwardingController.class)
@AutoConfigureMockMvc(addFilters = false)
class SpaForwardingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    /** Verify that a single-segment path forwards to index.html. */
    @Test
    void forwardRoot_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/somepage"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    /** Verify that a two-segment nested path forwards to index.html. */
    @Test
    void forwardNested2_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/player/details"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    /** Verify that a three-segment nested path forwards to index.html. */
    @Test
    void forwardNested3_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/a/b/c"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    /** Verify that a four-segment nested path forwards to index.html. */
    @Test
    void forwardNested4_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/a/b/c/d"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    /** Verify that an unknown /api/ path is not answered with the app's HTML. */
    @Test
    void apiPaths_areNotForwarded() throws Exception {
        mockMvc.perform(get("/api/nope"))
            .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/a/b"))
            .andExpect(status().isNotFound());
    }

    /** Verify that a path merely starting with "api" is still an app route. */
    @Test
    void pathStartingWithApi_isForwarded() throws Exception {
        mockMvc.perform(get("/apiary/x"))
            .andExpect(forwardedUrl("/index.html"));
    }
}
