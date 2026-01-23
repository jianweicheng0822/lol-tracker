package com.jw.backend;

import com.jw.backend.dto.PlayerStatsDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.StatsService;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    /**
     * Get aggregated player statistics.
     *
     * @param puuid  Player's unique ID
     * @param region Player's region
     * @param count  Number of matches to analyze (default: 10)
     * @return PlayerStatsDto with calculated statistics
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