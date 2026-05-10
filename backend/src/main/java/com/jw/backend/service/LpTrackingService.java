/**
 * @file LpTrackingService.java
 * @description Service for capturing and retrieving LP (League Points) history snapshots.
 * @module backend.service
 */
package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.LpSnapshotDto;
import com.jw.backend.entity.LpSnapshot;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.repository.LpSnapshotRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Track LP progression over time by capturing snapshots on rank or LP changes.
 *
 * <p>Snapshots are only persisted when a delta is detected compared to the most recent
 * stored value, preventing timeline bloat from repeated lookups without rank changes.</p>
 */
@Service
public class LpTrackingService {

    private final LpSnapshotRepository lpSnapshotRepository;
    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;

    /**
     * Construct the service with required dependencies.
     *
     * @param lpSnapshotRepository repository for LP snapshot persistence
     * @param riotApiService       service for fetching ranked data from Riot API
     * @param objectMapper         Jackson mapper for JSON parsing
     */
    public LpTrackingService(LpSnapshotRepository lpSnapshotRepository, RiotApiService riotApiService,
                             ObjectMapper objectMapper) {
        this.lpSnapshotRepository = lpSnapshotRepository;
        this.riotApiService = riotApiService;
        this.objectMapper = objectMapper;
    }

    /**
     * Capture an LP snapshot for all ranked queues if the rank or LP has changed.
     *
     * <p>Compares the current ranked data against the most recent snapshot per queue.
     * Only persists a new entry when tier, division, or LP differs — this avoids
     * generating redundant data points on repeated profile lookups.</p>
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot platform region for the League-v4 API call
     */
    public void captureSnapshot(String puuid, RiotRegion region) {
        try {
            String rankedJson = riotApiService.getRankedEntriesByPuuid(puuid, region);
            JsonNode entries = objectMapper.readTree(rankedJson);

            if (!entries.isArray()) return;

            for (JsonNode entry : entries) {
                String queueType = entry.path("queueType").asText("");
                String tier = entry.path("tier").asText("");
                String rank = entry.path("rank").asText("");
                int lp = entry.path("leaguePoints").asInt(0);

                if (tier.isEmpty()) continue;

                Optional<LpSnapshot> last = lpSnapshotRepository
                        .findTopByPuuidAndQueueTypeOrderByCapturedAtDesc(puuid, queueType);

                boolean changed = last.isEmpty()
                        || !last.get().getTier().equals(tier)
                        || !last.get().getRankDivision().equals(rank)
                        || last.get().getLeaguePoints() != lp;

                if (changed) {
                    lpSnapshotRepository.save(new LpSnapshot(puuid, queueType, tier, rank, lp));
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to capture LP snapshot: " + e.getMessage());
        }
    }

    /**
     * Retrieve chronological LP history for a player in a specific queue.
     *
     * @param puuid     the player's unique identifier
     * @param queueType the ranked queue type (e.g., "RANKED_SOLO_5x5")
     * @return time-ordered list of LP snapshot DTOs from oldest to newest
     */
    public List<LpSnapshotDto> getLpHistory(String puuid, String queueType) {
        return lpSnapshotRepository.findByPuuidAndQueueTypeOrderByCapturedAtAsc(puuid, queueType)
                .stream()
                .map(s -> new LpSnapshotDto(s.getQueueType(), s.getTier(), s.getRankDivision(), s.getLeaguePoints(), s.getCapturedAt()))
                .toList();
    }
}
