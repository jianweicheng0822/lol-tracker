package com.jw.backend.service;

import com.jw.backend.entity.TrackedPlayer;
import com.jw.backend.repository.TrackedPlayerRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Manages the tracked_players table — upserts a row every time a player is searched,
 * ensuring the background ingestion worker knows about them.
 */
@Service
public class PlayerTrackingService {

    private final TrackedPlayerRepository trackedPlayerRepository;

    public PlayerTrackingService(TrackedPlayerRepository trackedPlayerRepository) {
        this.trackedPlayerRepository = trackedPlayerRepository;
    }

    /**
     * Upsert a tracked player. On first search, creates a new row with immediate ingestion.
     * On subsequent searches, refreshes lastSearchedAt and bumps nextIngestAt to now
     * so the worker picks them up quickly.
     */
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

        trackedPlayerRepository.save(player);
    }
}
