/**
 * @file AuthIntegrationTest.java
 * @description Integration tests for user registration and login authentication flows.
 * @module backend.test
 */
package com.jw.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the full authentication lifecycle including registration, login,
 * duplicate username prevention, and invalid credential handling against a real database.
 */
class AuthIntegrationTest extends BaseIntegrationSupport {

    /** Verify that registration returns a JWT token and default free tier. */
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

    /** Verify that registering a duplicate username returns HTTP 409 Conflict. */
    @Test
    void register_duplicateUsername_returnsConflict() throws Exception {
        String body = """
            {"username": "dupuser", "password": "password123"}
            """;

        // First call succeeds; second triggers the uniqueness constraint
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());


        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("Username already taken"));
    }

    /** Verify that login with valid credentials returns a JWT token. */
    @Test
    void login_withValidCredentials_returnsToken() throws Exception {
        // Seed user for the login assertion below
        String regBody = """
            {"username": "loginuser", "password": "password123"}
            """;
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
            .andExpect(status().isCreated());


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

    /** Verify that login with an incorrect password returns HTTP 401. */
    @Test
    void login_withWrongPassword_returnsUnauthorized() throws Exception {
        // Seed user for the login assertion below
        String regBody = """
            {"username": "wrongpassuser", "password": "correct"}
            """;
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
            .andExpect(status().isCreated());


        String loginBody = """
            {"username": "wrongpassuser", "password": "wrong"}
            """;
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Invalid username or password"));
    }

    /** Verify that login with a non-existent username returns HTTP 401. */
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

    /** Verify that registration with blank fields returns HTTP 400. */
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
