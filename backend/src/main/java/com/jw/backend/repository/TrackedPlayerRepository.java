package com.jw.backend.repository;

import com.jw.backend.entity.TrackedPlayer;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrackedPlayerRepository extends JpaRepository<TrackedPlayer, Long> {

    Optional<TrackedPlayer> findByPuuid(String puuid);

    @Query("SELECT tp FROM TrackedPlayer tp WHERE tp.enabled = TRUE AND tp.nextIngestAt <= :now ORDER BY tp.nextIngestAt")
    List<TrackedPlayer> findDuePlayers(@Param("now") long now, Pageable pageable);
}
