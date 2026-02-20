package com.jw.backend;

import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.RankedService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** REST controller for ranked league data (Solo/Duo, Flex). */
@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/ranked")
public class RankedController {

    private final RankedService rankedService;

    public RankedController(RankedService rankedService) {
        this.rankedService = rankedService;
    }

    /** Returns ranked entries for a player by PUUID. */
    @GetMapping
    public List<RankedEntryDto> getRankedInfo(
            @RequestParam String puuid,
            @RequestParam RiotRegion region
    ) {
        return rankedService.getRankedInfo(puuid, region);
    }
}
