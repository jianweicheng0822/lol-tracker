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
 * Service for tracking LP (League Points) changes over time.
 *
 * Captures snapshots of a player's ranked position each time their profile is viewed.
 * Only saves a new snapshot when the rank actually changes (tier, division, or LP),
 * keeping the database lean while building a complete LP progression history.
 */
@Service
public class LpTrackingService {

    private final LpSnapshotRepository lpSnapshotRepository;
    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LpTrackingService(LpSnapshotRepository lpSnapshotRepository, RiotApiService riotApiService) {
        this.lpSnapshotRepository = lpSnapshotRepository;
        this.riotApiService = riotApiService;
    }

    /**
     * Fetches current ranked data from the Riot API and saves a snapshot if LP has changed.
     * Called automatically by SummonerController on every player profile lookup.
     * Iterates over all ranked queues (Solo/Duo, Flex) and snapshots each independently.
     */
    public void captureSnapshot(String puuid, RiotRegion region) {
        try {
            // Fetch current ranked entries from the Riot API (cached in RiotApiService)
            String rankedJson = riotApiService.getRankedEntriesByPuuid(puuid, region);
            JsonNode entries = objectMapper.readTree(rankedJson);

            if (!entries.isArray()) return;

            for (JsonNode entry : entries) {
                String queueType = entry.path("queueType").asText("");
                String tier = entry.path("tier").asText("");
                String rank = entry.path("rank").asText("");
                int lp = entry.path("leaguePoints").asInt(0);

                // Skip entries without a tier (unranked queues)
                if (tier.isEmpty()) continue;

                // Compare against the most recent snapshot to detect changes
                Optional<LpSnapshot> last = lpSnapshotRepository
                        .findTopByPuuidAndQueueTypeOrderByCapturedAtDesc(puuid, queueType);

                // Only save if this is the first snapshot or if tier/rank/LP changed
                boolean changed = last.isEmpty()
                        || !last.get().getTier().equals(tier)
                        || !last.get().getRankDivision().equals(rank)
                        || last.get().getLeaguePoints() != lp;

                if (changed) {
                    lpSnapshotRepository.save(new LpSnapshot(puuid, queueType, tier, rank, lp));
                }
            }
        } catch (Exception e) {
            // Non-fatal: LP tracking failure shouldn't block the profile lookup
            System.err.println("Failed to capture LP snapshot: " + e.getMessage());
        }
    }

    /** Returns full LP history for a queue in chronological order (oldest first) for chart rendering. */
    public List<LpSnapshotDto> getLpHistory(String puuid, String queueType) {
        return lpSnapshotRepository.findByPuuidAndQueueTypeOrderByCapturedAtAsc(puuid, queueType)
                .stream()
                .map(s -> new LpSnapshotDto(s.getQueueType(), s.getTier(), s.getRankDivision(), s.getLeaguePoints(), s.getCapturedAt()))
                .toList();
    }
}
