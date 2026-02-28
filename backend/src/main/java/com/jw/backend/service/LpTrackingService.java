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

@Service
public class LpTrackingService {

    private final LpSnapshotRepository lpSnapshotRepository;
    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LpTrackingService(LpSnapshotRepository lpSnapshotRepository, RiotApiService riotApiService) {
        this.lpSnapshotRepository = lpSnapshotRepository;
        this.riotApiService = riotApiService;
    }

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

    public List<LpSnapshotDto> getLpHistory(String puuid, String queueType) {
        return lpSnapshotRepository.findByPuuidAndQueueTypeOrderByCapturedAtAsc(puuid, queueType)
                .stream()
                .map(s -> new LpSnapshotDto(s.getQueueType(), s.getTier(), s.getRankDivision(), s.getLeaguePoints(), s.getCapturedAt()))
                .toList();
    }
}
