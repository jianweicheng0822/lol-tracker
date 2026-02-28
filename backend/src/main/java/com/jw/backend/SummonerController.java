package com.jw.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.RiotApiService;
import org.springframework.web.bind.annotation.*;

/** REST controller that resolves a Riot ID to an account with profile icon. */
@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/summoner")
public class SummonerController {

    private final RiotApiService riotApiService;
    private final LpTrackingService lpTrackingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SummonerController(RiotApiService riotApiService, LpTrackingService lpTrackingService) {
        this.riotApiService = riotApiService;
        this.lpTrackingService = lpTrackingService;
    }

    @GetMapping
    public String getSummoner(
            @RequestParam String gameName,
            @RequestParam String tag,
            @RequestParam RiotRegion region
    ) {
        try {
            // Account-v1 returns puuid, gameName, tagLine but NOT profileIconId.
            // We make a second call to Summoner-v4 to get the icon, then merge
            // both into a single JSON response so the frontend only needs one request.
            String accountJson = riotApiService.getAccountByRiotId(gameName, tag, region);
            ObjectNode accountNode = (ObjectNode) objectMapper.readTree(accountJson);
            String puuid = accountNode.path("puuid").asText();

            String summonerJson = riotApiService.getSummonerByPuuid(puuid, region);
            JsonNode summonerNode = objectMapper.readTree(summonerJson);
            int profileIconId = summonerNode.path("profileIconId").asInt(0);

            accountNode.put("profileIconId", profileIconId);

            // Capture LP snapshot for trend tracking
            lpTrackingService.captureSnapshot(puuid, region);

            return objectMapper.writeValueAsString(accountNode);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enrich account data", e);
        }
    }
}
