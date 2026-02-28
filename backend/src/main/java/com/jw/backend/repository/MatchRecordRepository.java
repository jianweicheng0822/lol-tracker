package com.jw.backend.repository;

import com.jw.backend.entity.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    List<MatchRecord> findByPuuidOrderByGameEndTimestampDesc(String puuid);

    boolean existsByPuuidAndMatchId(String puuid, String matchId);
}
