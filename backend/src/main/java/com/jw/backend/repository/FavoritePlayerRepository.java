/**
 * @file FavoritePlayerRepository.java
 * @description Spring Data JPA repository for FavoritePlayer entity operations.
 * @module backend.repository
 */
package com.jw.backend.repository;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.FavoritePlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Provide CRUD and user-scoped lookup operations for the favorite_players table.
 */
@Repository
public interface FavoritePlayerRepository extends JpaRepository<FavoritePlayer, Long> {

    List<FavoritePlayer> findAllByUser(AppUser user);

    Optional<FavoritePlayer> findByUserAndPuuid(AppUser user, String puuid);

    boolean existsByUserAndPuuid(AppUser user, String puuid);

    void deleteByUserAndPuuid(AppUser user, String puuid);
}
