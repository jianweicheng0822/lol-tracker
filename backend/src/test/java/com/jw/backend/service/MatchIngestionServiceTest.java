package com.jw.backend.service;

import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.entity.TrackedPlayer;
import com.jw.backend.repository.TrackedPlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchIngestionServiceTest {

    @Mock private TrackedPlayerRepository trackedPlayerRepository;
    @Mock private RiotApiService riotApiService;
    @Mock private MatchHistoryService matchHistoryService;
    @Mock private LpTrackingService lpTrackingService;

    private MatchIngestionService service;

    @BeforeEach
    void setUp() throws Exception {
        service = new MatchIngestionService(
            trackedPlayerRepository, riotApiService, matchHistoryService, lpTrackingService);
        // Set batchSize via reflection since @Value won't be injected in unit test
        var field = MatchIngestionService.class.getDeclaredField("batchSize");
        field.setAccessible(true);
        field.setInt(service, 5);
    }

    @Test
    void ingestBatch_doesNothingWhenNoPlayersDue() {
        when(trackedPlayerRepository.findDuePlayers(anyLong(), any(PageRequest.class)))
            .thenReturn(List.of());

        service.ingestBatch();

        verify(riotApiService, never()).getRecentMatchSummaries(anyString(), any(), anyInt());
    }

    @Test
    void ingestBatch_processesPlayerAndPersistsMatches() {
        TrackedPlayer player = new TrackedPlayer();
        player.setPuuid("puuid-1");
        player.setRegion("NA");
        player.setLastSearchedAt(System.currentTimeMillis());

        when(trackedPlayerRepository.findDuePlayers(anyLong(), any(PageRequest.class)))
            .thenReturn(List.of(player));

        MatchSummaryDto summary = new MatchSummaryDto(
            "NA1_1", "Ahri", 5, 2, 3, true, 1800, 1700000000000L,
            18, 4, 14, new int[7], 200, 20, 420, 15,
            List.of(), List.of(), 8112, 8200, new int[4], 0, 25000, 16000, "MID"
        );
        when(riotApiService.getRecentMatchSummaries("puuid-1", com.jw.backend.region.RiotRegion.NA, 10))
            .thenReturn(List.of(summary));

        service.ingestBatch();

        verify(matchHistoryService).persistMatchRecords(eq("puuid-1"), eq("NA"), anyList());
        verify(lpTrackingService).captureSnapshot(eq("puuid-1"), eq(com.jw.backend.region.RiotRegion.NA));
        verify(trackedPlayerRepository).save(player);
    }

    @Test
    void ingestBatch_skipsEmptyMatchList() {
        TrackedPlayer player = new TrackedPlayer();
        player.setPuuid("puuid-2");
        player.setRegion("KR");
        player.setLastSearchedAt(System.currentTimeMillis());

        when(trackedPlayerRepository.findDuePlayers(anyLong(), any(PageRequest.class)))
            .thenReturn(List.of(player));
        when(riotApiService.getRecentMatchSummaries("puuid-2", com.jw.backend.region.RiotRegion.KR, 10))
            .thenReturn(List.of());

        service.ingestBatch();

        verify(matchHistoryService, never()).persistMatchRecords(anyString(), anyString(), anyList());
        verify(lpTrackingService).captureSnapshot("puuid-2", com.jw.backend.region.RiotRegion.KR);
    }

    @Test
    void ingestBatch_schedulesRetryOnFailure() {
        TrackedPlayer player = new TrackedPlayer();
        player.setPuuid("puuid-3");
        player.setRegion("NA");
        player.setLastSearchedAt(System.currentTimeMillis());

        when(trackedPlayerRepository.findDuePlayers(anyLong(), any(PageRequest.class)))
            .thenReturn(List.of(player));
        when(riotApiService.getRecentMatchSummaries("puuid-3", com.jw.backend.region.RiotRegion.NA, 10))
            .thenThrow(new RuntimeException("API error"));

        service.ingestBatch();

        verify(trackedPlayerRepository).save(player);
        // nextIngestAt should be set ~5 minutes from now
        assertTrue(player.getNextIngestAt() > 0);
    }
}
