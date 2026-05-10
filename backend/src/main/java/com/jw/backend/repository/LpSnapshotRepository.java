/**
 * @file LpSnapshotRepository.java
 * @description Spring Data JPA repository for LP snapshot persistence and retrieval.
 * @module backend.repository
 */
package com.jw.backend.repository;

import com.jw.backend.entity.LpSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Provide time-ordered LP snapshot queries for trend charts and delta detection.
 */
@Repository
public interface LpSnapshotRepository extends JpaRepository<LpSnapshot, Long> {

    /**
     * Retrieve all snapshots for a player/queue in chronological order.
     *
     * <p>Oldest-first ordering supports left-to-right chart rendering.</p>
     *
     * @param puuid     the player's unique identifier
     * @param queueType the ranked queue type
     * @return chronologically ordered list of LP snapshots
     */
    List<LpSnapshot> findByPuuidAndQueueTypeOrderByCapturedAtAsc(String puuid, String queueType);

    /**
     * Retrieve the most recent snapshot for delta detection before persisting a new one.
     *
     * @param puuid     the player's unique identifier
     * @param queueType the ranked queue type
     * @return the most recent snapshot, if any exist
     */
    Optional<LpSnapshot> findTopByPuuidAndQueueTypeOrderByCapturedAtDesc(String puuid, String queueType);
}
