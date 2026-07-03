/**
 * @file LeaderboardController.java
 * @description REST controller exposing the ranked leaderboard endpoint for apex tiers.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.dto.LeaderboardEntryDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private static final Set<String> ALLOWED_TIERS = Set.of("challenger", "grandmaster", "master");

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<?> getLeaderboard(
            @RequestParam(defaultValue = "NA") RiotRegion region,
            @RequestParam(defaultValue = "RANKED_SOLO_5x5") String queue,
            @RequestParam(defaultValue = "challenger") String tier
    ) {
        String normalizedTier = tier.toLowerCase();
        if (!ALLOWED_TIERS.contains(normalizedTier)) {
            return ResponseEntity.badRequest().body(
                    java.util.Map.of("message", "Invalid tier. Allowed: challenger, grandmaster, master"));
        }
        List<LeaderboardEntryDto> result = leaderboardService.getLeaderboard(normalizedTier, queue, region);
        return ResponseEntity.ok(result);
    }
}
