/**
 * @file FavoriteController.java
 * @description REST controller for managing a user's favorite players list.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.service.FavoritePlayerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Manage CRUD operations for the authenticated user's favorite players.
 *
 * <p>Favorites are keyed by the player's PUUID and scoped to the authenticated user.</p>
 */
@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoritePlayerService favoriteService;
    private final AppUserRepository appUserRepository;

    public FavoriteController(FavoritePlayerService favoriteService, AppUserRepository appUserRepository) {
        this.favoriteService = favoriteService;
        this.appUserRepository = appUserRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAllFavorites(Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(favoriteService.getAllFavorites(user));
    }

    @PostMapping
    public ResponseEntity<?> addFavorite(@RequestBody Map<String, String> body, Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        String puuid = body.get("puuid");
        String gameName = body.get("gameName");
        String tagLine = body.get("tagLine");
        String region = body.get("region");

        if (puuid == null || gameName == null || tagLine == null || region == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Missing required fields: puuid, gameName, tagLine, region"
            ));
        }

        FavoritePlayer saved = favoriteService.addFavorite(user, puuid, gameName, tagLine, region);

        if (saved == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Player is already in favorites"
            ));
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{puuid}")
    public ResponseEntity<?> removeFavorite(@PathVariable String puuid, Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        boolean removed = favoriteService.removeFavorite(user, puuid);

        if (!removed) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of("message", "Removed from favorites"));
    }

    @GetMapping("/check/{puuid}")
    public ResponseEntity<?> checkFavorite(@PathVariable String puuid, Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        boolean isFavorite = favoriteService.isFavorite(user, puuid);
        return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
    }

    private AppUser resolveUser(Principal principal) {
        if (principal == null) {
            return null;
        }
        Optional<AppUser> optUser = appUserRepository.findByUsername(principal.getName());
        return optUser.orElse(null);
    }
}
