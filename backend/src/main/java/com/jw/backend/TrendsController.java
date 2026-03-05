package com.jw.backend;

import com.jw.backend.dto.ChampionStatsDto;
import com.jw.backend.dto.LpSnapshotDto;
import com.jw.backend.dto.MatchTrendPointDto;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.MatchHistoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for trend and analytics endpoints.
 * Serves data from the local database (not the Riot API directly) for
 * the Performance and Champions dashboard tabs.
 *
 * Data is populated automatically as users browse match histories and player profiles —
 * match records and LP snapshots are captured by MatchController and SummonerController.
 */
@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/trends")
public class TrendsController {

    private final MatchHistoryService matchHistoryService;
    private final LpTrackingService lpTrackingService;

    public TrendsController(MatchHistoryService matchHistoryService, LpTrackingService lpTrackingService) {
        this.matchHistoryService = matchHistoryService;
        this.lpTrackingService = lpTrackingService;
    }

    /** Returns per-champion aggregated stats (win rate, KDA, damage) sorted by games played. */
    @GetMapping("/champions")
    public List<ChampionStatsDto> getChampionStats(@RequestParam String puuid) {
        return matchHistoryService.getChampionStats(puuid);
    }

    /** Returns per-match data points in chronological order for trend line charts. */
    @GetMapping("/matches")
    public List<MatchTrendPointDto> getMatchTrends(@RequestParam String puuid) {
        return matchHistoryService.getMatchTrends(puuid);
    }

    /**
     * Returns LP progression snapshots for a specific queue (defaults to Solo/Duo).
     * The default "RANKED_SOLO_5x5" matches the Riot API queue type identifier
     * for Solo/Duo ranked, which is the most commonly tracked queue.
     */
    @GetMapping("/lp")
    public List<LpSnapshotDto> getLpHistory(
            @RequestParam String puuid,
            @RequestParam(defaultValue = "RANKED_SOLO_5x5") String queueType
    ) {
        return lpTrackingService.getLpHistory(puuid, queueType);
    }
}
