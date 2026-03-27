package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.MatchHistoryService;
import com.jw.backend.service.RateLimitService;
import com.jw.backend.service.RiotApiService;
import com.jw.backend.service.SubscriptionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.MatchDetailDto;
import java.util.List;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final RiotApiService riotApiService;
    private final MatchHistoryService matchHistoryService;
    private final SubscriptionService subscriptionService;
    private final RateLimitService rateLimitService;

    public MatchController(RiotApiService riotApiService, MatchHistoryService matchHistoryService,
                           SubscriptionService subscriptionService, RateLimitService rateLimitService) {
        this.riotApiService = riotApiService;
        this.matchHistoryService = matchHistoryService;
        this.subscriptionService = subscriptionService;
        this.rateLimitService = rateLimitService;
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
            @RequestParam(defaultValue = "3") int count,
            @RequestParam(defaultValue = "0") int start,
            HttpSession session
    ) {
        AppUser user = subscriptionService.getOrCreateUser(session);
        rateLimitService.checkRateLimit(session, user.getTier());

        int maxCount = subscriptionService.getMaxMatchCount(session);
        if (count > maxCount) count = maxCount;

        List<MatchSummaryDto> summaries = riotApiService.getRecentMatchSummaries(puuid, region, count, start);

        // Persist match records for trend tracking
        matchHistoryService.persistMatchRecords(puuid, region.name(), summaries);

        return summaries;
    }
}
