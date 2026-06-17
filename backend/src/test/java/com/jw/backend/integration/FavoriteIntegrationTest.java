/**
 * @file FavoriteIntegrationTest.java
 * @description Integration tests for the favorite players CRUD lifecycle.
 * @module backend.test
 */
package com.jw.backend.integration;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.repository.FavoritePlayerRepository;
import com.jw.backend.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the complete add/check/list/remove lifecycle for favorite players
 * against a real PostgreSQL database with per-user isolation.
 */
class FavoriteIntegrationTest extends BaseIntegrationSupport {

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private FavoritePlayerRepository favoritePlayerRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private String authToken;

    @BeforeEach
    void setUpUser() {
        favoritePlayerRepository.deleteAll();
        appUserRepository.deleteAll();

        AppUser user = new AppUser("favtestuser", "hashedpw", true);
        appUserRepository.save(user);
        authToken = "Bearer " + jwtUtil.generateToken("favtestuser");
    }

    /** Verify the full CRUD round-trip: list, add, check, list again, delete, and verify removal. */
    @Test
    void favoriteCrud_roundTrip() throws Exception {
        mockMvc.perform(get("/api/favorites")
                .header("Authorization", authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));

        String addBody = """
            {"puuid": "int-test-puuid", "gameName": "TestPlayer", "tagLine": "NA1", "region": "NA"}
            """;
        mockMvc.perform(post("/api/favorites")
                .header("Authorization", authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(addBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameName").value("TestPlayer"));

        mockMvc.perform(get("/api/favorites/check/int-test-puuid")
                .header("Authorization", authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(true));

        mockMvc.perform(get("/api/favorites")
                .header("Authorization", authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(delete("/api/favorites/int-test-puuid")
                .header("Authorization", authToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/favorites/check/int-test-puuid")
                .header("Authorization", authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(false));
    }

    /** Verify that unauthenticated requests return 401. */
    @Test
    void favorites_whenUnauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isUnauthorized());
    }
}
