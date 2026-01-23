package com.jw.backend.service;

import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.repository.FavoritePlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for managing favorite players.
 * Contains business logic between Controller and Repository.
 */
@Service
public class FavoritePlayerService {

    private final FavoritePlayerRepository repository;

    public FavoritePlayerService(FavoritePlayerRepository repository) {
        this.repository = repository;
    }

    /**
     * Get all favorite players.
     */
    public List<FavoritePlayer> getAllFavorites() {
        return repository.findAll();
    }

    /**
     * Add a player to favorites.
     * Returns the saved entity, or null if already exists.
     */
    public FavoritePlayer addFavorite(String puuid, String gameName, String tagLine, String region) {
        // Check if already saved
        if (repository.existsByPuuid(puuid)) {
            return null; // Already a favorite
        }

        // Create and save new favorite
        FavoritePlayer favorite = new FavoritePlayer(puuid, gameName, tagLine, region);
        return repository.save(favorite);
    }

    /**
     * Remove a player from favorites.
     */
    @Transactional
    public boolean removeFavorite(String puuid) {
        if (!repository.existsByPuuid(puuid)) {
            return false; // Not found
        }

        repository.deleteByPuuid(puuid);
        return true;
    }

    /**
     * Check if a player is in favorites.
     */
    public boolean isFavorite(String puuid) {
        return repository.existsByPuuid(puuid);
    }
}
