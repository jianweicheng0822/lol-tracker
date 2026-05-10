/**
 * @file RankedController.java
 * @description REST controller for retrieving ranked queue standings from Riot API.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.RankedService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Expose ranked league information for a given player across all queues.
 */
@RestController
@RequestMapping("/api/ranked")
public class RankedController {

    private final RankedService rankedService;

    /**
     * Construct the controller with the ranked service dependency.
     *
     * @param rankedService service for fetching ranked data from Riot API
     */
    public RankedController(RankedService rankedService) {
        this.rankedService = rankedService;
    }

    /**
     * Retrieve ranked entries (tier, rank, LP, win/loss) for a player.
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot platform region
     * @return list of ranked entries, one per queue the player has placements in
     */
    @GetMapping
    public List<RankedEntryDto> getRankedInfo(
            @RequestParam String puuid,
            @RequestParam RiotRegion region
    ) {
        return rankedService.getRankedInfo(puuid, region);
    }
}
