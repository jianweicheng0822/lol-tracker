package com.jw.backend;

import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.RiotApiService;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/summoner")
public class SummonerController {

    private final RiotApiService riotApiService;

    public SummonerController(RiotApiService riotApiService) {
        this.riotApiService = riotApiService;
    }

    @GetMapping
    public String getSummoner(
            @RequestParam String gameName,
            @RequestParam String tag,
            @RequestParam RiotRegion region
    ) {
        // Returns raw JSON from Riot Account API for now (fastest to validate end-to-end).
        return riotApiService.getAccountByRiotId(gameName, tag, region);
    }
}
