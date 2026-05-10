/**
 * @file StatsController.java
 * @description REST controller for computing aggregate player statistics from match data.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.dto.PlayerStatsDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.StatsService;
import org.springframework.web.bind.annotation.*;

/**
 * Expose computed player statistics derived from recent Riot Match-v5 data.
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    /**
     * Construct the controller with the stats service dependency.
     *
     * @param statsService service for computing aggregate player statistics
     */
    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    /**
     * Calculate aggregate statistics from the player's most recent matches.
     *
     * <p>Statistics are computed live from Riot Match-v5 API data rather than
     * from the local database, ensuring real-time accuracy.</p>
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot routing region
     * @param count  number of recent matches to include in the calculation (default 10)
     * @return aggregated player statistics including win rate, KDA, and averages
     */
    @GetMapping
    public PlayerStatsDto getPlayerStats(
            @RequestParam String puuid,
            @RequestParam RiotRegion region,
            @RequestParam(defaultValue = "10") int count
    ) {
        return statsService.calculateStats(puuid, region, count);
    }
}
