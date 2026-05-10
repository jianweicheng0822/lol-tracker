/**
 * @file TrendsController.java
 * @description REST controller for locally-stored trend and analytics data.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.dto.ChampionStatsDto;
import com.jw.backend.dto.LpSnapshotDto;
import com.jw.backend.dto.MatchTrendPointDto;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.MatchHistoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Serve analytics data from the local database to avoid Riot API rate limits.
 *
 * <p>These endpoints power the frontend trend charts and champion statistics views.
 * Data is populated asynchronously as matches are fetched through other endpoints.</p>
 */
@RestController
@RequestMapping("/api/trends")
public class TrendsController {

    private final MatchHistoryService matchHistoryService;
    private final LpTrackingService lpTrackingService;

    /**
     * Construct the controller with required service dependencies.
     *
     * @param matchHistoryService service for querying persisted match records
     * @param lpTrackingService   service for querying LP history snapshots
     */
    public TrendsController(MatchHistoryService matchHistoryService, LpTrackingService lpTrackingService) {
        this.matchHistoryService = matchHistoryService;
        this.lpTrackingService = lpTrackingService;
    }

    /**
     * Retrieve per-champion aggregated statistics sorted by games played.
     *
     * <p>Surfaces the player's most-played champions first, allowing the UI
     * to highlight main champions.</p>
     *
     * @param puuid the player's unique identifier
     * @return list of champion statistics ordered by total games descending
     */
    @GetMapping("/champions")
    public List<ChampionStatsDto> getChampionStats(@RequestParam String puuid) {
        return matchHistoryService.getChampionStats(puuid);
    }

    /**
     * Retrieve chronological match data points for trend line charts.
     *
     * @param puuid the player's unique identifier
     * @return time-ordered list of match performance data points
     */
    @GetMapping("/matches")
    public List<MatchTrendPointDto> getMatchTrends(@RequestParam String puuid) {
        return matchHistoryService.getMatchTrends(puuid);
    }

    /**
     * Retrieve LP history for a specific ranked queue.
     *
     * <p>Defaults to RANKED_SOLO_5x5 as the primary competitive queue.</p>
     *
     * @param puuid     the player's unique identifier
     * @param queueType the ranked queue type (default: RANKED_SOLO_5x5)
     * @return chronological list of LP snapshots
     */
    @GetMapping("/lp")
    public List<LpSnapshotDto> getLpHistory(
            @RequestParam String puuid,
            @RequestParam(defaultValue = "RANKED_SOLO_5x5") String queueType
    ) {
        return lpTrackingService.getLpHistory(puuid, queueType);
    }
}
