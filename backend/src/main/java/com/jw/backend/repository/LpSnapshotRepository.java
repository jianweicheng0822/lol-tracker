package com.jw.backend.repository;

import com.jw.backend.entity.LpSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for LpSnapshot entities.
 *
 * Provides queries for LP history charts and change detection.
 * Spring Data JPA generates SQL from method names automatically.
 */
@Repository
public interface LpSnapshotRepository extends JpaRepository<LpSnapshot, Long> {

    /**
     * Get full LP history for a queue, oldest first (chronological order for charts).
     * Generated SQL: SELECT * FROM lp_snapshots WHERE puuid = ? AND queue_type = ? ORDER BY captured_at ASC
     */
    List<LpSnapshot> findByPuuidAndQueueTypeOrderByCapturedAtAsc(String puuid, String queueType);

    /**
     * Get the most recent snapshot for change detection.
     * "findTop" limits to 1 result; ordered DESC so it returns the latest.
     * Used to check if LP has changed before saving a new snapshot.
     * Generated SQL: SELECT * FROM lp_snapshots WHERE puuid = ? AND queue_type = ? ORDER BY captured_at DESC LIMIT 1
     */
    Optional<LpSnapshot> findTopByPuuidAndQueueTypeOrderByCapturedAtDesc(String puuid, String queueType);
}
