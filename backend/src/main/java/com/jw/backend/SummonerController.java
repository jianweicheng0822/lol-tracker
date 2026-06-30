/**
 * @file SummonerController.java
 * @description REST controller that enriches Riot Account data with Summoner profile details.
 * @module backend.controller
 */
package com.jw.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.SummonerDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.PlayerTrackingService;
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
    private final PlayerTrackingService playerTrackingService;
    private final ObjectMapper objectMapper;

    /**
     * Construct the controller with required service dependencies.
     *
     * @param riotApiService       service for Riot API communication
     * @param lpTrackingService    service for capturing LP snapshots
     * @param playerTrackingService service for tracking searched players
     * @param objectMapper         Jackson mapper for JSON manipulation
     */
    public SummonerController(RiotApiService riotApiService, LpTrackingService lpTrackingService,
                              PlayerTrackingService playerTrackingService, ObjectMapper objectMapper) {
        this.riotApiService = riotApiService;
        this.lpTrackingService = lpTrackingService;
        this.playerTrackingService = playerTrackingService;
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
     * @return enriched summoner data with profile icon
     * @throws RuntimeException if either Riot API call fails or JSON parsing errors occur
     */
    @GetMapping
    public SummonerDto getSummoner(
            @RequestParam String gameName,
            @RequestParam String tag,
            @RequestParam RiotRegion region
    ) {
        try {
            String accountJson = riotApiService.getAccountByRiotId(gameName, tag, region);
            return enrichAccount(accountJson, region);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enrich account data", e);
        }
    }

    /**
     * Look up a summoner by PUUID and return enriched account data.
     *
     * <p>Resolves the PUUID to current gameName/tagLine via Account-v1, then enriches
     * with profile icon and LP snapshot — identical response shape to the name-based endpoint.</p>
     *
     * @param puuid  the player's PUUID
     * @param region the Riot platform region
     * @return enriched summoner data with profile icon
     */
    @GetMapping("/by-puuid")
    public SummonerDto getSummonerByPuuid(
            @RequestParam String puuid,
            @RequestParam RiotRegion region
    ) {
        try {
            String accountJson = riotApiService.getAccountByPuuid(puuid, region);
            return enrichAccount(accountJson, region);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enrich account data by PUUID", e);
        }
    }

    /**
     * Shared enrichment logic: adds profileIconId and captures an LP snapshot.
     */
    private SummonerDto enrichAccount(String accountJson, RiotRegion region) throws Exception {
        JsonNode accountNode = objectMapper.readTree(accountJson);
        String puuid = accountNode.path("puuid").asText();
        String gameName = accountNode.path("gameName").asText("");
        String tagLine = accountNode.path("tagLine").asText("");

        String summonerJson = riotApiService.getSummonerByPuuid(puuid, region);
        JsonNode summonerNode = objectMapper.readTree(summonerJson);
        int profileIconId = summonerNode.path("profileIconId").asInt(0);

        lpTrackingService.captureSnapshot(puuid, region);
        playerTrackingService.trackPlayer(puuid, region.name(), gameName, tagLine);

        return new SummonerDto(puuid, gameName, tagLine, profileIconId);
    }
}
