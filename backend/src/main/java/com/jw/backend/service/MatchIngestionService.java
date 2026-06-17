package com.jw.backend.service;

import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.entity.TrackedPlayer;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.repository.TrackedPlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Background worker that continuously ingests new matches for tracked players.
 * Runs on a fixed 10-second schedule, processing a small batch each tick to
 * stay within Riot API rate limits.
 */
@Service
@ConditionalOnProperty(name = "ingestion.enabled", havingValue = "true", matchIfMissing = true)
public class MatchIngestionService {

    private static final Logger log = LoggerFactory.getLogger(MatchIngestionService.class);

    private static final long TWO_MINUTES_MS    = 2L * 60 * 1000;
    private static final long FIFTEEN_MINUTES_MS = 15L * 60 * 1000;
    private static final long ONE_HOUR_MS        = 60L * 60 * 1000;
    private static final long SIX_HOURS_MS       = 6L * 60 * 60 * 1000;
    private static final long TWENTY_FOUR_HOURS_MS = 24L * 60 * 60 * 1000;
    private static final long SEVEN_DAYS_MS      = 7L * 24 * 60 * 60 * 1000;
    private static final long THIRTY_DAYS_MS     = 30L * 24 * 60 * 60 * 1000;

    private final TrackedPlayerRepository trackedPlayerRepository;
    private final RiotApiService riotApiService;
    private final MatchHistoryService matchHistoryService;
    private final LpTrackingService lpTrackingService;

    @Value("${ingestion.batch-size:5}")
    private int batchSize;

    public MatchIngestionService(TrackedPlayerRepository trackedPlayerRepository,
                                 RiotApiService riotApiService,
                                 MatchHistoryService matchHistoryService,
                                 LpTrackingService lpTrackingService) {
        this.trackedPlayerRepository = trackedPlayerRepository;
        this.riotApiService = riotApiService;
        this.matchHistoryService = matchHistoryService;
        this.lpTrackingService = lpTrackingService;
    }

    @Scheduled(fixedDelay = 10_000)
    public void ingestBatch() {
        long now = System.currentTimeMillis();
        List<TrackedPlayer> duePlayers = trackedPlayerRepository.findDuePlayers(now, PageRequest.of(0, batchSize));

        if (duePlayers.isEmpty()) return;

        log.info("Ingesting matches for {} player(s)", duePlayers.size());

        for (TrackedPlayer player : duePlayers) {
            try {
                ingestPlayer(player, now);
            } catch (Exception e) {
                log.error("Failed to ingest matches for puuid={}: {}", player.getPuuid(), e.getMessage());
                // Schedule retry in 5 minutes on failure
                player.setNextIngestAt(now + 5L * 60 * 1000);
                trackedPlayerRepository.save(player);
            }
        }
    }

    private void ingestPlayer(TrackedPlayer player, long now) {
        RiotRegion region = RiotRegion.valueOf(player.getRegion());
        String puuid = player.getPuuid();

        List<MatchSummaryDto> summaries = riotApiService.getRecentMatchSummaries(puuid, region, 10);

        if (!summaries.isEmpty()) {
            matchHistoryService.persistMatchRecords(puuid, region.name(), summaries);
            log.debug("Persisted {} match records for {}", summaries.size(), puuid);
        }

        lpTrackingService.captureSnapshot(puuid, region);

        player.setLastIngestedAt(now);
        player.setNextIngestAt(now + computeInterval(player.getLastSearchedAt(), now));
        trackedPlayerRepository.save(player);
    }

    /**
     * Compute the next ingestion interval based on how recently the player was searched.
     * More recently searched players get polled more frequently.
     */
    private long computeInterval(long lastSearchedAt, long now) {
        long sinceLast = now - lastSearchedAt;
        if (sinceLast < ONE_HOUR_MS)          return TWO_MINUTES_MS;
        if (sinceLast < TWENTY_FOUR_HOURS_MS) return FIFTEEN_MINUTES_MS;
        if (sinceLast < SEVEN_DAYS_MS)        return ONE_HOUR_MS;
        if (sinceLast < THIRTY_DAYS_MS)       return SIX_HOURS_MS;
        return TWENTY_FOUR_HOURS_MS;
    }
}
