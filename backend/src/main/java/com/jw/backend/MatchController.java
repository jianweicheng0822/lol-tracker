package com.jw.backend;

import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.MatchHistoryService;
import com.jw.backend.service.RiotApiService;
import org.springframework.web.bind.annotation.*;
import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.MatchDetailDto;
import java.util.List;

/** REST controller for match history and match detail endpoints. */
@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final RiotApiService riotApiService;
    private final MatchHistoryService matchHistoryService;

    public MatchController(RiotApiService riotApiService, MatchHistoryService matchHistoryService) {
        this.riotApiService = riotApiService;
        this.matchHistoryService = matchHistoryService;
    }

    /** Returns recent match IDs for a player. */
    @GetMapping("/recent")
    public String getRecentMatches(
            @RequestParam String puuid,
            @RequestParam RiotRegion region,
            @RequestParam(defaultValue = "10") int count
    ) {
        return riotApiService.getRecentMatchIds(puuid, region, count);
    }
    /** Returns raw match detail JSON from the Riot API. */
    @GetMapping("/detail")
    public String getMatchDetail(
            @RequestParam String matchId,
            @RequestParam RiotRegion region
    ) {
        return riotApiService.getMatchDetail(matchId, region);
    }
    /** Returns a fully parsed match detail with all participants, teams, and objectives. */
    @GetMapping("/full-detail")
    public MatchDetailDto getFullMatchDetail(
            @RequestParam String matchId,
            @RequestParam RiotRegion region
    ) {
        String detailJson = riotApiService.getMatchDetail(matchId, region);
        return riotApiService.extractFullMatchDetail(detailJson, matchId);
    }

    /** Returns match summaries (KDA, items, runes) for a player's recent games. */
    @GetMapping("/summary")
    public List<MatchSummaryDto> getMatchSummaries(
            @RequestParam String puuid,
            @RequestParam RiotRegion region,
            @RequestParam(defaultValue = "3") int count,
            @RequestParam(defaultValue = "0") int start
    ) {
        List<MatchSummaryDto> summaries = riotApiService.getRecentMatchSummaries(puuid, region, count, start);

        // Persist match records for trend tracking
        matchHistoryService.persistMatchRecords(puuid, region.name(), summaries);

        return summaries;
    }
}
