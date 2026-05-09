package com.jw.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class FavoriteIntegrationTest extends BaseIntegrationSupport {

    @Test
    void favoriteCrud_roundTrip() throws Exception {
        // List empty favorites
        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));

        // Add a favorite
        String addBody = """
            {"puuid": "int-test-puuid", "gameName": "TestPlayer", "tagLine": "NA1", "region": "NA"}
            """;
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(addBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameName").value("TestPlayer"));

        // Check it exists
        mockMvc.perform(get("/api/favorites/check/int-test-puuid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(true));

        // List favorites — should have 1
        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));

        // Remove the favorite
        mockMvc.perform(delete("/api/favorites/int-test-puuid"))
            .andExpect(status().isOk());

        // Check it's gone
        mockMvc.perform(get("/api/favorites/check/int-test-puuid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(false));
    }
}
