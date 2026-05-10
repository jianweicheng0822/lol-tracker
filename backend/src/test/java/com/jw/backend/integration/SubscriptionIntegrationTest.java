/**
 * @file SubscriptionIntegrationTest.java
 * @description Integration tests for subscription tier management and AI access gating.
 * @module backend.test
 */
package com.jw.backend.integration;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate subscription tier retrieval, upgrade flow, and AI endpoint access control
 * for both anonymous and authenticated users against a real database.
 */
class SubscriptionIntegrationTest extends BaseIntegrationSupport {

    /** Verify that an anonymous user defaults to the free tier (0). */
    @Test
    void anonymousUser_getsFreeTeir() throws Exception {
        mockMvc.perform(get("/api/tier"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(0));
    }

    /** Verify that an authenticated user can upgrade from free to PRO tier. */
    @Test
    void authenticatedUser_canUpgrade() throws Exception {
        String regBody = """
            {"username": "upgradeuser", "password": "pass123"}
            """;
        MvcResult regResult = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
            .andExpect(status().isCreated())
            .andReturn();

        String token = JsonPath.read(regResult.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(get("/api/tier")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(0));

        mockMvc.perform(get("/api/upgrade")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(1));

        mockMvc.perform(get("/api/tier")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(1));
    }

    /** Verify that the AI analyze endpoint blocks free-tier users with HTTP 403. */
    @Test
    void aiAccess_blockedForFreeUser() throws Exception {
        String body = """
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

        mockMvc.perform(post("/api/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }
}
