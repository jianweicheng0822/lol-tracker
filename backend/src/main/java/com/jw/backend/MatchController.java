/**
 * @file MatchController.java
 * @description REST controller for retrieving match data from the Riot Games API.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.MatchHistoryService;
import com.jw.backend.service.RiotApiService;
import org.springframework.web.bind.annotation.*;
import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.MatchDetailDto;

import java.util.List;

/**
 * Provide match history and match detail data by proxying the Riot Match-v5 API.
 *
 * <p>Match records are persisted locally for trend analysis.</p>
 */
@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final RiotApiService riotApiService;
    private final MatchHistoryService matchHistoryService;

    /**
     * Construct the controller with required service dependencies.
     *
     * @param riotApiService      service for Riot API communication
     * @param matchHistoryService service for persisting match records locally
     */
    public MatchController(RiotApiService riotApiService, MatchHistoryService matchHistoryService) {
        this.riotApiService = riotApiService;
        this.matchHistoryService = matchHistoryService;
    }

    /**
     * Retrieve recent match IDs for a player as raw JSON from Riot API.
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot routing region
     * @param count  number of match IDs to retrieve (default 10)
     * @return raw JSON array of match ID strings
     */
    @GetMapping("/recent")
    public String getRecentMatches(
            @RequestParam String puuid,
            @RequestParam RiotRegion region,
            @RequestParam(defaultValue = "10") int count
    ) {
        count = Math.max(1, Math.min(count, 100));
        return riotApiService.getRecentMatchIds(puuid, region, count);
    }

    /**
     * Retrieve full match detail JSON for a specific match from Riot API.
     *
     * @param matchId the Riot match identifier (e.g., "NA1_4567890123")
     * @param region  the Riot routing region
     * @return raw JSON match detail payload
     */
    @GetMapping("/detail")
    public String getMatchDetail(
            @RequestParam String matchId,
            @RequestParam RiotRegion region
    ) {
        return riotApiService.getMatchDetail(matchId, region);
    }

    /**
     * Retrieve a structured match detail DTO with parsed participant data.
     *
     * @param matchId the Riot match identifier
     * @param region  the Riot routing region
     * @return parsed match detail with team and participant breakdowns
     */
    @GetMapping("/full-detail")
    public MatchDetailDto getFullMatchDetail(
            @RequestParam String matchId,
            @RequestParam RiotRegion region
    ) {
        String detailJson = riotApiService.getMatchDetail(matchId, region);
        return riotApiService.extractFullMatchDetail(detailJson, matchId);
    }

    /**
     * Retrieve paginated match summaries for a player.
     *
     * <p>Successfully fetched matches are persisted for local trend analysis.</p>
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot routing region
     * @param count  number of matches to retrieve
     * @param start  pagination offset index
     * @return list of match summary DTOs
     */
    @GetMapping("/summary")
    public List<MatchSummaryDto> getMatchSummaries(
            @RequestParam String puuid,
            @RequestParam RiotRegion region,
            @RequestParam(defaultValue = "20") int count,
            @RequestParam(defaultValue = "0") int start
    ) {
        count = Math.max(1, Math.min(count, 100));
        start = Math.max(0, start);

        List<MatchSummaryDto> summaries = riotApiService.getRecentMatchSummaries(puuid, region, count, start);

        matchHistoryService.persistMatchRecords(puuid, region.name(), summaries);

        return summaries;
    }
}
