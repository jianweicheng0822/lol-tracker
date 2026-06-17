/**
 * @file FavoritePlayerService.java
 * @description Service layer for managing the user's favorite players collection.
 * @module backend.service
 */
package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.repository.FavoritePlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Provide CRUD operations for favorite players, scoped to the authenticated user.
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
     * Retrieve all favorite players for the given user.
     *
     * @param user the authenticated user
     * @return list of the user's favorite player entries
     */
    public List<FavoritePlayer> getAllFavorites(AppUser user) {
        return repository.findAllByUser(user);
    }

    /**
     * Add a player to the user's favorites if not already present.
     *
     * @param user     the authenticated user
     * @param puuid    the player's globally unique identifier
     * @param gameName the player's display name
     * @param tagLine  the player's tag line
     * @param region   the Riot platform region
     * @return the saved entity, or null if the player already exists in the user's favorites
     */
    public FavoritePlayer addFavorite(AppUser user, String puuid, String gameName, String tagLine, String region) {
        if (repository.existsByUserAndPuuid(user, puuid)) {
            return null;
        }
        FavoritePlayer favorite = new FavoritePlayer(puuid, gameName, tagLine, region);
        favorite.setUser(user);
        return repository.save(favorite);
    }

    /**
     * Remove a player from the user's favorites by PUUID.
     *
     * @param user  the authenticated user
     * @param puuid the player's globally unique identifier
     * @return true if the entry was found and deleted, false otherwise
     */
    @Transactional
    public boolean removeFavorite(AppUser user, String puuid) {
        if (!repository.existsByUserAndPuuid(user, puuid)) {
            return false;
        }
        repository.deleteByUserAndPuuid(user, puuid);
        return true;
    }

    /**
     * Check whether a player exists in the user's favorites list.
     *
     * @param user  the authenticated user
     * @param puuid the player's globally unique identifier
     * @return true if the player is favorited by this user
     */
    public boolean isFavorite(AppUser user, String puuid) {
        return repository.existsByUserAndPuuid(user, puuid);
    }
}
