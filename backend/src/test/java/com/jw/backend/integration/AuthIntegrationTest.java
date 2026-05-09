package com.jw.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthIntegrationTest extends BaseIntegrationSupport {

    @Test
    void register_returnsTokenAndTier() throws Exception {
        String body = """
            {"username": "newuser1", "password": "password123"}
            """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.tier").value(0));
    }

    @Test
    void register_duplicateUsername_returnsConflict() throws Exception {
        String body = """
            {"username": "dupuser", "password": "password123"}
            """;

        // First registration succeeds
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        // Second registration fails
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("Username already taken"));
    }

    @Test
    void login_withValidCredentials_returnsToken() throws Exception {
        // Register first
        String regBody = """
            {"username": "loginuser", "password": "password123"}
            """;
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
            .andExpect(status().isCreated());

        // Login
        String loginBody = """
            {"username": "loginuser", "password": "password123"}
            """;
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.tier").value(0));
    }

    @Test
    void login_withWrongPassword_returnsUnauthorized() throws Exception {
        // Register first
        String regBody = """
            {"username": "wrongpassuser", "password": "correct"}
            """;
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
            .andExpect(status().isCreated());

        // Login with wrong password
        String loginBody = """
            {"username": "wrongpassuser", "password": "wrong"}
            """;
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Invalid username or password"));
    }

    @Test
    void login_withNonexistentUser_returnsUnauthorized() throws Exception {
        String loginBody = """
            {"username": "doesnotexist", "password": "anything"}
            """;
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void register_withBlankFields_returnsBadRequest() throws Exception {
        String body = """
            {"username": "", "password": ""}
            """;
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }
}
