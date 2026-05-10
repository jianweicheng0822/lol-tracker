/**
 * @file SummonerController.java
 * @description REST controller that enriches Riot Account data with Summoner profile details.
 * @module backend.controller
 */
package com.jw.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.RiotApiService;
import org.springframework.web.bind.annotation.*;

/**
 * Combine Riot Account-v1 and Summoner-v4 responses into a single enriched payload.
 *
 * <p>Account-v1 provides the PUUID and Riot ID but lacks profile icon data.
 * A secondary Summoner-v4 call supplements the response with the profile icon ID.
 * An LP snapshot is captured on each lookup for historical tracking.</p>
 */
@RestController
@RequestMapping("/api/summoner")
public class SummonerController {

    private final RiotApiService riotApiService;
    private final LpTrackingService lpTrackingService;
    private final ObjectMapper objectMapper;

    /**
     * Construct the controller with required service dependencies.
     *
     * @param riotApiService  service for Riot API communication
     * @param lpTrackingService service for capturing LP snapshots
     * @param objectMapper    Jackson mapper for JSON manipulation
     */
    public SummonerController(RiotApiService riotApiService, LpTrackingService lpTrackingService,
                              ObjectMapper objectMapper) {
        this.riotApiService = riotApiService;
        this.lpTrackingService = lpTrackingService;
        this.objectMapper = objectMapper;
    }

    /**
     * Look up a summoner by Riot ID and return enriched account data.
     *
     * <p>Merges the profile icon from Summoner-v4 into the Account-v1 response
     * and triggers an LP snapshot capture for trend tracking.</p>
     *
     * @param gameName the player's game name (before the #)
     * @param tag      the player's tag line (after the #)
     * @param region   the Riot platform region
     * @return JSON string containing merged account and summoner data
     * @throws RuntimeException if either Riot API call fails or JSON parsing errors occur
     */
    @GetMapping
    public String getSummoner(
            @RequestParam String gameName,
            @RequestParam String tag,
            @RequestParam RiotRegion region
    ) {
        try {
            // Account-v1 lacks profileIconId; Summoner-v4 provides it via a second call.
            String accountJson = riotApiService.getAccountByRiotId(gameName, tag, region);
            ObjectNode accountNode = (ObjectNode) objectMapper.readTree(accountJson);
            String puuid = accountNode.path("puuid").asText();

            String summonerJson = riotApiService.getSummonerByPuuid(puuid, region);
            JsonNode summonerNode = objectMapper.readTree(summonerJson);
            int profileIconId = summonerNode.path("profileIconId").asInt(0);

            accountNode.put("profileIconId", profileIconId);

            lpTrackingService.captureSnapshot(puuid, region);

            return objectMapper.writeValueAsString(accountNode);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enrich account data", e);
        }
    }
}
