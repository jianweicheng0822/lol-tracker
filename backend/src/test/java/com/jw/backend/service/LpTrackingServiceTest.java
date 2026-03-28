package com.jw.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.LpSnapshotDto;
import com.jw.backend.entity.LpSnapshot;
import com.jw.backend.region.RiotRegion;
import com.jw.backend.repository.LpSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LpTrackingServiceTest {

    @Mock
    private LpSnapshotRepository lpSnapshotRepository;

    @Mock
    private RiotApiService riotApiService;

    private LpTrackingService service;

    @BeforeEach
    void setUp() {
        service = new LpTrackingService(lpSnapshotRepository, riotApiService, new ObjectMapper());
    }

    // =====================================================
    // captureSnapshot
    // =====================================================

    @Test
    void captureSnapshot_withNewData_savesSnapshot() {
        String json = """
            [{"queueType":"RANKED_SOLO_5x5","tier":"GOLD","rank":"I","leaguePoints":75}]
            """;
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn(json);
        when(lpSnapshotRepository.findTopByPuuidAndQueueTypeOrderByCapturedAtDesc("puuid", "RANKED_SOLO_5x5"))
            .thenReturn(Optional.empty());

        service.captureSnapshot("puuid", RiotRegion.NA);

        verify(lpSnapshotRepository).save(any(LpSnapshot.class));
    }

    @Test
    void captureSnapshot_withUnchangedData_skipsSave() {
        String json = """
            [{"queueType":"RANKED_SOLO_5x5","tier":"GOLD","rank":"I","leaguePoints":75}]
            """;
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn(json);

        LpSnapshot existing = new LpSnapshot("puuid", "RANKED_SOLO_5x5", "GOLD", "I", 75);
        when(lpSnapshotRepository.findTopByPuuidAndQueueTypeOrderByCapturedAtDesc("puuid", "RANKED_SOLO_5x5"))
            .thenReturn(Optional.of(existing));

        service.captureSnapshot("puuid", RiotRegion.NA);

        verify(lpSnapshotRepository, never()).save(any());
    }

    @Test
    void captureSnapshot_withChangedLp_savesSnapshot() {
        String json = """
            [{"queueType":"RANKED_SOLO_5x5","tier":"GOLD","rank":"I","leaguePoints":80}]
            """;
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn(json);

        LpSnapshot existing = new LpSnapshot("puuid", "RANKED_SOLO_5x5", "GOLD", "I", 75);
        when(lpSnapshotRepository.findTopByPuuidAndQueueTypeOrderByCapturedAtDesc("puuid", "RANKED_SOLO_5x5"))
            .thenReturn(Optional.of(existing));

        service.captureSnapshot("puuid", RiotRegion.NA);

        verify(lpSnapshotRepository).save(any(LpSnapshot.class));
    }

    @Test
    void captureSnapshot_withChangedTier_savesSnapshot() {
        String json = """
            [{"queueType":"RANKED_SOLO_5x5","tier":"PLATINUM","rank":"IV","leaguePoints":0}]
            """;
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn(json);

        LpSnapshot existing = new LpSnapshot("puuid", "RANKED_SOLO_5x5", "GOLD", "I", 99);
        when(lpSnapshotRepository.findTopByPuuidAndQueueTypeOrderByCapturedAtDesc("puuid", "RANKED_SOLO_5x5"))
            .thenReturn(Optional.of(existing));

        service.captureSnapshot("puuid", RiotRegion.NA);

        verify(lpSnapshotRepository).save(any(LpSnapshot.class));
    }

    @Test
    void captureSnapshot_withEmptyTier_skipsEntry() {
        String json = """
            [{"queueType":"RANKED_SOLO_5x5","tier":"","rank":"","leaguePoints":0}]
            """;
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn(json);

        service.captureSnapshot("puuid", RiotRegion.NA);

        verify(lpSnapshotRepository, never()).save(any());
    }

    @Test
    void captureSnapshot_withNonArrayJson_doesNothing() {
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn("{}");

        service.captureSnapshot("puuid", RiotRegion.NA);

        verify(lpSnapshotRepository, never()).save(any());
    }

    @Test
    void captureSnapshot_withException_doesNotThrow() {
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenThrow(new RuntimeException("API error"));

        assertDoesNotThrow(() -> service.captureSnapshot("puuid", RiotRegion.NA));
    }

    // =====================================================
    // getLpHistory
    // =====================================================

    @Test
    void getLpHistory_returnsSnapshotsAsDtos() {
        LpSnapshot snap = new LpSnapshot("puuid", "RANKED_SOLO_5x5", "GOLD", "I", 75);
        when(lpSnapshotRepository.findByPuuidAndQueueTypeOrderByCapturedAtAsc("puuid", "RANKED_SOLO_5x5"))
            .thenReturn(List.of(snap));

        List<LpSnapshotDto> result = service.getLpHistory("puuid", "RANKED_SOLO_5x5");

        assertEquals(1, result.size());
        assertEquals("GOLD", result.get(0).tier());
        assertEquals("I", result.get(0).rankDivision());
        assertEquals(75, result.get(0).leaguePoints());
    }

    @Test
    void getLpHistory_withEmptyHistory_returnsEmptyList() {
        when(lpSnapshotRepository.findByPuuidAndQueueTypeOrderByCapturedAtAsc("puuid", "RANKED_SOLO_5x5"))
            .thenReturn(List.of());

        List<LpSnapshotDto> result = service.getLpHistory("puuid", "RANKED_SOLO_5x5");

        assertTrue(result.isEmpty());
    }
}
