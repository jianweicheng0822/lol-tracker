package com.jw.backend;

import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.service.FavoritePlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for favorite players.
 */
@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoritePlayerService favoriteService;

    public FavoriteController(FavoritePlayerService favoriteService) {
        this.favoriteService = favoriteService;
    }

    /**
     * GET /api/favorites
     * Get all favorite players.
     */
    @GetMapping
    public List<FavoritePlayer> getAllFavorites() {
        return favoriteService.getAllFavorites();
    }

    /**
     * POST /api/favorites
     * Add a player to favorites.
     * Body: { "puuid": "...", "gameName": "...", "tagLine": "...", "region": "..." }
     */
    @PostMapping
    public ResponseEntity<?> addFavorite(@RequestBody Map<String, String> body) {
        String puuid = body.get("puuid");
        String gameName = body.get("gameName");
        String tagLine = body.get("tagLine");
        String region = body.get("region");

        // Validate input
        if (puuid == null || gameName == null || tagLine == null || region == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Missing required fields: puuid, gameName, tagLine, region"
            ));
        }

        FavoritePlayer saved = favoriteService.addFavorite(puuid, gameName, tagLine, region);

        if (saved == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Player is already in favorites"
            ));
        }

        return ResponseEntity.ok(saved);
    }

    /**
     * DELETE /api/favorites/{puuid}
     * Remove a player from favorites.
     */
    @DeleteMapping("/{puuid}")
    public ResponseEntity<?> removeFavorite(@PathVariable String puuid) {
        boolean removed = favoriteService.removeFavorite(puuid);

        if (!removed) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of("message", "Removed from favorites"));
    }

    /**
     * GET /api/favorites/check/{puuid}
     * Check if a player is in favorites.
     */
    @GetMapping("/check/{puuid}")
    public Map<String, Boolean> checkFavorite(@PathVariable String puuid) {
        boolean isFavorite = favoriteService.isFavorite(puuid);
        return Map.of("isFavorite", isFavorite);
    }
}
