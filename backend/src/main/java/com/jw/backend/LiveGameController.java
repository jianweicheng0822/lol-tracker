package com.jw.backend;

import com.jw.backend.dto.LiveGameDto;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.LiveGameService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/live-game")
public class LiveGameController {

    private final LiveGameService liveGameService;

    public LiveGameController(LiveGameService liveGameService) {
        this.liveGameService = liveGameService;
    }

    @GetMapping
    public ResponseEntity<?> getLiveGame(
            @RequestParam String puuid,
            @RequestParam RiotRegion region
    ) {
        Optional<LiveGameDto> result = liveGameService.getActiveGame(puuid, region);
        // Not being in a game is the normal case, so it's "no content" rather than an error
        // (a 404 showed up as a failed request in the browser console on every profile)
        if (result.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result.get());
    }
}
