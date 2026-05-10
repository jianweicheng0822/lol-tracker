/**
 * @file MatchRecordRepository.java
 * @description Spring Data JPA repository for local match record persistence.
 * @module backend.repository
 */
package com.jw.backend.repository;

import com.jw.backend.entity.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Provide match record queries for analytics and deduplication checks.
 */
@Repository
public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    /**
     * Retrieve all match records for a player ordered by newest first.
     *
     * <p>The analytics layer reverses this ordering when chronological display is needed.</p>
     *
     * @param puuid the player's unique identifier
     * @return match records sorted by game end timestamp descending
     */
    List<MatchRecord> findByPuuidOrderByGameEndTimestampDesc(String puuid);

    /**
     * Check whether a match record already exists for deduplication.
     *
     * <p>Riot match IDs are globally unique across all shards.</p>
     *
     * @param puuid   the player's unique identifier
     * @param matchId the Riot match identifier
     * @return true if the record already exists
     */
    boolean existsByPuuidAndMatchId(String puuid, String matchId);
}
