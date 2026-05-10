/**
 * @file FavoritePlayerRepository.java
 * @description Spring Data JPA repository for FavoritePlayer entity operations.
 * @module backend.repository
 */
package com.jw.backend.repository;

import com.jw.backend.entity.FavoritePlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Provide CRUD and PUUID-based lookup operations for the favorite_players table.
 */
@Repository
public interface FavoritePlayerRepository extends JpaRepository<FavoritePlayer, Long> {

    /**
     * Find a favorite player by their PUUID.
     *
     * @param puuid the player's unique identifier
     * @return the matching favorite entry, if present
     */
    Optional<FavoritePlayer> findByPuuid(String puuid);

    /**
     * Check whether a favorite entry exists for the given PUUID.
     *
     * @param puuid the player's unique identifier
     * @return true if the player is in favorites
     */
    boolean existsByPuuid(String puuid);

    /**
     * Delete a favorite entry by PUUID.
     *
     * @param puuid the player's unique identifier
     */
    void deleteByPuuid(String puuid);
}
