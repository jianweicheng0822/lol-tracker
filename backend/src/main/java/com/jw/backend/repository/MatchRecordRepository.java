/**
 * @file MatchRecordRepository.java
 * @description Spring Data JPA repository for local match record persistence.
 * @module backend.repository
 */
package com.jw.backend.repository;

import com.jw.backend.entity.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT m.championName, COUNT(m), SUM(CASE WHEN m.win = true THEN 1 ELSE 0 END), " +
           "AVG(m.kills), AVG(m.deaths), AVG(m.assists), " +
           "AVG(m.totalMinionsKilled + m.neutralMinionsKilled), " +
           "AVG(m.totalDamageDealtToChampions), AVG(m.goldEarned) " +
           "FROM MatchRecord m WHERE (:queueId IS NULL OR m.queueId = :queueId) " +
           "GROUP BY m.championName ORDER BY COUNT(m) DESC")
    List<Object[]> aggregateChampionStats(@Param("queueId") Integer queueId);

    @Query("SELECT COUNT(DISTINCT m.matchId) FROM MatchRecord m WHERE (:queueId IS NULL OR m.queueId = :queueId)")
    long countDistinctMatches(@Param("queueId") Integer queueId);

    @Query("SELECT COUNT(DISTINCT m.puuid) FROM MatchRecord m")
    long countDistinctPlayers();

    @Query("SELECT COUNT(DISTINCT m.championName) FROM MatchRecord m")
    long countDistinctChampions();
}
