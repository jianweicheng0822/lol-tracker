package com.jw.backend;

import com.jw.backend.dto.MultiSearchPlayerDto;
import com.jw.backend.dto.MultiSearchRequest;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.service.MultiSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/multi-search")
public class MultiSearchController {

    private final MultiSearchService multiSearchService;

    public MultiSearchController(MultiSearchService multiSearchService) {
        this.multiSearchService = multiSearchService;
    }

    @PostMapping
    public ResponseEntity<?> multiSearch(@RequestBody MultiSearchRequest request) {
        if (request.players() == null || request.players().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Player list must not be empty"));
        }
        if (request.players().size() > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Maximum 5 players allowed"));
        }

        RiotRegion region;
        try {
            region = RiotRegion.valueOf(request.region().toUpperCase());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid region: " + request.region()));
        }

        List<String[]> nameTagPairs = new ArrayList<>();
        for (String player : request.players()) {
            String trimmed = player.trim();
            int hashIndex = trimmed.lastIndexOf('#');
            if (hashIndex < 1 || hashIndex == trimmed.length() - 1) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid format: '" + trimmed + "'. Expected Name#Tag"));
            }
            String gameName = trimmed.substring(0, hashIndex).trim();
            String tagLine = trimmed.substring(hashIndex + 1).trim();
            nameTagPairs.add(new String[]{gameName, tagLine});
        }

        List<MultiSearchPlayerDto> results = multiSearchService.lookup(nameTagPairs, region);
        return ResponseEntity.ok(results);
    }
}
