/**
 * @file FavoriteIntegrationTest.java
 * @description Integration tests for the favorite players CRUD lifecycle.
 * @module backend.test
 */
package com.jw.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the complete add/check/list/remove lifecycle for favorite players
 * against a real PostgreSQL database.
 */
class FavoriteIntegrationTest extends BaseIntegrationSupport {

    /** Verify the full CRUD round-trip: list, add, check, list again, delete, and verify removal. */
    @Test
    void favoriteCrud_roundTrip() throws Exception {
        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));

        String addBody = """
            {"puuid": "int-test-puuid", "gameName": "TestPlayer", "tagLine": "NA1", "region": "NA"}
            """;
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(addBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameName").value("TestPlayer"));

        mockMvc.perform(get("/api/favorites/check/int-test-puuid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(true));

        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(delete("/api/favorites/int-test-puuid"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/favorites/check/int-test-puuid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(false));
    }
}
