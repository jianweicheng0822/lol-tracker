package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.service.SearchHistoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/search-history")
public class SearchHistoryController {

    private final SearchHistoryService searchHistoryService;
    private final AppUserRepository appUserRepository;

    public SearchHistoryController(SearchHistoryService searchHistoryService, AppUserRepository appUserRepository) {
        this.searchHistoryService = searchHistoryService;
        this.appUserRepository = appUserRepository;
    }

    @GetMapping
    public ResponseEntity<?> getHistory(Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(searchHistoryService.getHistory(user));
    }

    @PostMapping
    public ResponseEntity<?> addEntry(@RequestBody Map<String, String> body, Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        String gameName = body.get("gameName");
        String tagLine = body.get("tagLine");
        String region = body.get("region");

        if (gameName == null || tagLine == null || region == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Missing required fields: gameName, tagLine, region"
            ));
        }

        searchHistoryService.addEntry(user, gameName, tagLine, region);
        return ResponseEntity.ok(Map.of("message", "Search history updated"));
    }

    @DeleteMapping
    public ResponseEntity<?> removeEntry(@RequestBody Map<String, String> body, Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        String gameName = body.get("gameName");
        String tagLine = body.get("tagLine");
        String region = body.get("region");

        if (gameName == null || tagLine == null || region == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Missing required fields: gameName, tagLine, region"
            ));
        }

        searchHistoryService.removeEntry(user, gameName, tagLine, region);
        return ResponseEntity.ok(Map.of("message", "Entry removed"));
    }

    @DeleteMapping("/all")
    public ResponseEntity<?> clearHistory(Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        searchHistoryService.clearHistory(user);
        return ResponseEntity.ok(Map.of("message", "Search history cleared"));
    }

    private AppUser resolveUser(Principal principal) {
        if (principal == null) {
            return null;
        }
        Optional<AppUser> optUser = appUserRepository.findByUsername(principal.getName());
        return optUser.orElse(null);
    }
}
