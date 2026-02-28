package com.jw.backend;

import com.jw.backend.dto.ChampionStatsDto;
import com.jw.backend.dto.LpSnapshotDto;
import com.jw.backend.dto.MatchTrendPointDto;
import com.jw.backend.service.LpTrackingService;
import com.jw.backend.service.MatchHistoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/champions")
    public List<ChampionStatsDto> getChampionStats(@RequestParam String puuid) {
        return matchHistoryService.getChampionStats(puuid);
    }

    @GetMapping("/matches")
    public List<MatchTrendPointDto> getMatchTrends(@RequestParam String puuid) {
        return matchHistoryService.getMatchTrends(puuid);
    }

    @GetMapping("/lp")
    public List<LpSnapshotDto> getLpHistory(
            @RequestParam String puuid,
            @RequestParam(defaultValue = "RANKED_SOLO_5x5") String queueType
    ) {
        return lpTrackingService.getLpHistory(puuid, queueType);
    }
}
