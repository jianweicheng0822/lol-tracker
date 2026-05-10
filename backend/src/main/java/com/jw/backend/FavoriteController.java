/**
 * @file FavoriteController.java
 * @description REST controller for managing a user's favorite players list.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.service.FavoritePlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Manage CRUD operations for the authenticated user's favorite players.
 *
 * <p>Favorites are keyed by the player's PUUID to ensure uniqueness regardless
 * of name changes.</p>
 */
@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoritePlayerService favoriteService;

    /**
     * Construct the controller with the favorite player service.
     *
     * @param favoriteService service handling favorite player business logic
     */
    public FavoriteController(FavoritePlayerService favoriteService) {
        this.favoriteService = favoriteService;
    }

    /**
     * Retrieve all favorite players for the current user.
     *
     * @return list of all persisted favorite player entries
     */
    @GetMapping
    public List<FavoritePlayer> getAllFavorites() {
        return favoriteService.getAllFavorites();
    }

    /**
     * Add a player to the favorites list.
     *
     * <p>Rejects duplicates at the service layer, returning a 400 response
     * if the player is already favorited.</p>
     *
     * @param body request body containing puuid, gameName, tagLine, and region fields
     * @return the persisted FavoritePlayer entity, or an error response
     */
    @PostMapping
    public ResponseEntity<?> addFavorite(@RequestBody Map<String, String> body) {
        String puuid = body.get("puuid");
        String gameName = body.get("gameName");
        String tagLine = body.get("tagLine");
        String region = body.get("region");

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
     * Remove a player from favorites by PUUID.
     *
     * <p>Operation is idempotent — returns 404 only if the entry was not found.</p>
     *
     * @param puuid the player's unique identifier
     * @return success message or 404 if not found
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
     * Check whether a player is in the current user's favorites.
     *
     * <p>Used by the UI to toggle the favorite icon state without fetching the full list.</p>
     *
     * @param puuid the player's unique identifier
     * @return map containing a single "isFavorite" boolean flag
     */
    @GetMapping("/check/{puuid}")
    public Map<String, Boolean> checkFavorite(@PathVariable String puuid) {
        boolean isFavorite = favoriteService.isFavorite(puuid);
        return Map.of("isFavorite", isFavorite);
    }
}
