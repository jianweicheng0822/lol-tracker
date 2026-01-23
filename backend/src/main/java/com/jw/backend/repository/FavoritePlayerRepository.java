package com.jw.backend.repository;

import com.jw.backend.entity.FavoritePlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for FavoritePlayer entity.
 *
 * By extending JpaRepository, we get these methods FREE:
 * - save(entity)      → INSERT or UPDATE
 * - findAll()         → SELECT *
 * - findById(id)      → SELECT WHERE id = ?
 * - deleteById(id)    → DELETE WHERE id = ?
 * - count()           → COUNT(*)
 */
@Repository
public interface FavoritePlayerRepository extends JpaRepository<FavoritePlayer, Long> {

    // =====================================================
    // Custom query methods
    // Spring generates the SQL automatically from method name!
    // =====================================================

    /**
     * Find a favorite by puuid.
     * Generated SQL: SELECT * FROM favorite_players WHERE puuid = ?
     */
    Optional<FavoritePlayer> findByPuuid(String puuid);

    /**
     * Check if a player is already saved.
     * Generated SQL: SELECT COUNT(*) > 0 FROM favorite_players WHERE puuid = ?
     */
    boolean existsByPuuid(String puuid);

    /**
     * Delete by puuid.
     * Generated SQL: DELETE FROM favorite_players WHERE puuid = ?
     */
    void deleteByPuuid(String puuid);
}