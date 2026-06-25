package com.jw.backend.service;

import com.jw.backend.entity.TrackedPlayer;
import com.jw.backend.repository.TrackedPlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Manages the tracked_players table — upserts a row every time a player is searched,
 * ensuring the background ingestion worker knows about them.
 */
@Service
public class PlayerTrackingService {

    private static final Logger log = LoggerFactory.getLogger(PlayerTrackingService.class);

    private final TrackedPlayerRepository trackedPlayerRepository;

    public PlayerTrackingService(TrackedPlayerRepository trackedPlayerRepository) {
        this.trackedPlayerRepository = trackedPlayerRepository;
    }

    /**
     * Upsert a tracked player. On first search, creates a new row with immediate ingestion.
     * On subsequent searches, refreshes lastSearchedAt and bumps nextIngestAt to now
     * so the worker picks them up quickly.
     */
    @Transactional
    public void trackPlayer(String puuid, String region, String gameName, String tagLine) {
        long now = System.currentTimeMillis();
        Optional<TrackedPlayer> existing = trackedPlayerRepository.findByPuuid(puuid);

        TrackedPlayer player;
        if (existing.isPresent()) {
            player = existing.get();
            player.setRegion(region);
            player.setGameName(gameName);
            player.setTagLine(tagLine);
            player.setLastSearchedAt(now);
            player.setNextIngestAt(now);
        } else {
            player = new TrackedPlayer();
            player.setPuuid(puuid);
            player.setRegion(region);
            player.setGameName(gameName);
            player.setTagLine(tagLine);
            player.setLastSearchedAt(now);
            player.setNextIngestAt(now);
        }

        try {
            trackedPlayerRepository.save(player);
        } catch (DataIntegrityViolationException e) {
            log.debug("Concurrent insert for puuid={}, retrying as update", puuid);
            TrackedPlayer retried = trackedPlayerRepository.findByPuuid(puuid).orElseThrow();
            retried.setRegion(region);
            retried.setGameName(gameName);
            retried.setTagLine(tagLine);
            retried.setLastSearchedAt(now);
            retried.setNextIngestAt(now);
            trackedPlayerRepository.save(retried);
        }
    }
}
