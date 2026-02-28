package com.jw.backend.repository;

import com.jw.backend.entity.LpSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LpSnapshotRepository extends JpaRepository<LpSnapshot, Long> {

    List<LpSnapshot> findByPuuidAndQueueTypeOrderByCapturedAtAsc(String puuid, String queueType);

    Optional<LpSnapshot> findTopByPuuidAndQueueTypeOrderByCapturedAtDesc(String puuid, String queueType);
}
