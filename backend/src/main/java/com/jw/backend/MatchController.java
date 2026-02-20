package com.jw.backend;

import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.RiotApiService;
import org.springframework.web.bind.annotation.*;
import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.MatchDetailDto;
import java.util.List;
@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final RiotApiService riotApiService;

    public MatchController(RiotApiService riotApiService) {
        this.riotApiService = riotApiService;
    }

    @GetMapping("/recent")
    public String getRecentMatches(
            @RequestParam String puuid,
            @RequestParam RiotRegion region,
            @RequestParam(defaultValue = "10") int count
    ) {
        return riotApiService.getRecentMatchIds(puuid, region, count);
    }
    @GetMapping("/detail")
    public String getMatchDetail(
            @RequestParam String matchId,
            @RequestParam RiotRegion region
    ) {
        return riotApiService.getMatchDetail(matchId, region);
    }
    @GetMapping("/full-detail")
    public MatchDetailDto getFullMatchDetail(
            @RequestParam String matchId,
            @RequestParam RiotRegion region
    ) {
        String detailJson = riotApiService.getMatchDetail(matchId, region);
        return riotApiService.extractFullMatchDetail(detailJson, matchId);
    }

    @GetMapping("/summary")
    public List<MatchSummaryDto> getMatchSummaries(
            @RequestParam String puuid,
            @RequestParam RiotRegion region,
            @RequestParam(defaultValue = "3") int count
    ) {
        // Return parsed summaries instead of raw JSON
        return riotApiService.getRecentMatchSummaries(puuid, region, count);
    }
}
