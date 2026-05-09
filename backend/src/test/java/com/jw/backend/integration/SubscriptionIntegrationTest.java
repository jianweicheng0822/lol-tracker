package com.jw.backend.integration;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SubscriptionIntegrationTest extends BaseIntegrationSupport {

    @Test
    void anonymousUser_getsFreeTeir() throws Exception {
        mockMvc.perform(get("/api/tier"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(0));
    }

    @Test
    void authenticatedUser_canUpgrade() throws Exception {
        // Register
        String regBody = """
            {"username": "upgradeuser", "password": "pass123"}
            """;
        MvcResult regResult = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
            .andExpect(status().isCreated())
            .andReturn();

        String token = JsonPath.read(regResult.getResponse().getContentAsString(), "$.token");

        // Check tier — should be FREE
        mockMvc.perform(get("/api/tier")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(0));

        // Upgrade
        mockMvc.perform(get("/api/upgrade")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(1));

        // Verify tier is now PRO
        mockMvc.perform(get("/api/tier")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(1));
    }

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
