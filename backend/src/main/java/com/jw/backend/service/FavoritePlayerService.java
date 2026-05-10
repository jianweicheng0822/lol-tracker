/**
 * @file FavoritePlayerService.java
 * @description Service layer for managing the user's favorite players collection.
 * @module backend.service
 */
package com.jw.backend.service;

import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.repository.FavoritePlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Provide CRUD operations for favorite players, keyed by PUUID for uniqueness.
 */
@Service
public class FavoritePlayerService {

    private final FavoritePlayerRepository repository;

    /**
     * Construct the service with the favorite player repository.
     *
     * @param repository JPA repository for favorite player persistence
     */
    public FavoritePlayerService(FavoritePlayerRepository repository) {
        this.repository = repository;
    }

    /**
     * Retrieve all favorite players.
     *
     * @return complete list of persisted favorite player entries
     */
    public List<FavoritePlayer> getAllFavorites() {
        return repository.findAll();
    }

    /**
     * Add a player to favorites if not already present.
     *
     * @param puuid    the player's globally unique identifier
     * @param gameName the player's display name
     * @param tagLine  the player's tag line
     * @param region   the Riot platform region
     * @return the saved entity, or null if the player already exists in favorites
     */
    public FavoritePlayer addFavorite(String puuid, String gameName, String tagLine, String region) {
        if (repository.existsByPuuid(puuid)) {
            return null;
        }
        FavoritePlayer favorite = new FavoritePlayer(puuid, gameName, tagLine, region);
        return repository.save(favorite);
    }

    /**
     * Remove a player from favorites by PUUID.
     *
     * @param puuid the player's globally unique identifier
     * @return true if the entry was found and deleted, false otherwise
     */
    @Transactional
    public boolean removeFavorite(String puuid) {
        if (!repository.existsByPuuid(puuid)) {
            return false;
        }
        repository.deleteByPuuid(puuid);
        return true;
    }

    /**
     * Check whether a player exists in the favorites list.
     *
     * @param puuid the player's globally unique identifier
     * @return true if the player is favorited
     */
    public boolean isFavorite(String puuid) {
        return repository.existsByPuuid(puuid);
    }
}
