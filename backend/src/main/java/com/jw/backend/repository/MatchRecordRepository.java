package com.jw.backend.repository;

import com.jw.backend.entity.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for MatchRecord entities.
 *
 * Spring Data JPA generates the SQL automatically from method names:
 * - findBy...  → SELECT WHERE ...
 * - existsBy... → SELECT COUNT(*) > 0 WHERE ...
 */
@Repository
public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    /**
     * Get all matches for a player, newest first.
     * Used by champion stats aggregation and match trend charts.
     * Generated SQL: SELECT * FROM match_records WHERE puuid = ? ORDER BY game_end_timestamp DESC
     */
    List<MatchRecord> findByPuuidOrderByGameEndTimestampDesc(String puuid);

    /**
     * Check if a specific match is already persisted for this player.
     * Prevents duplicate inserts when the same matches are fetched again.
     * Generated SQL: SELECT COUNT(*) > 0 FROM match_records WHERE puuid = ? AND match_id = ?
     */
    boolean existsByPuuidAndMatchId(String puuid, String matchId);
}
