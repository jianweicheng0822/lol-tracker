package com.jw.backend.service;

import com.jw.backend.dto.ChampionStatsDto;
import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.MatchTrendPointDto;
import com.jw.backend.entity.MatchRecord;
import com.jw.backend.repository.MatchRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchHistoryServiceTest {

    @Mock
    private MatchRecordRepository matchRecordRepository;

    private MatchHistoryService service;

    @BeforeEach
    void setUp() {
        service = new MatchHistoryService(matchRecordRepository);
    }

    private MatchRecord makeRecord(String matchId, String champion, int kills, int deaths, int assists,
                                    boolean win, long timestamp) {
        MatchRecord r = new MatchRecord();
        r.setPuuid("puuid");
        r.setMatchId(matchId);
        r.setRegion("NA");
        r.setChampionName(champion);
        r.setKills(kills);
        r.setDeaths(deaths);
        r.setAssists(assists);
        r.setWin(win);
        r.setGameDurationSec(1800);
        r.setGameEndTimestamp(timestamp);
        r.setQueueId(420);
        r.setTotalDamageDealtToChampions(15000);
        r.setGoldEarned(12000);
        r.setTotalMinionsKilled(150);
        r.setNeutralMinionsKilled(30);
        r.setPlacement(0);
        r.setTeamTotalKills(30);
        return r;
    }

    // =====================================================
    // persistMatchRecords
    // =====================================================

    @Test
    void persistMatchRecords_savesNewRecords() {
        when(matchRecordRepository.existsByPuuidAndMatchId("puuid", "NA1_1")).thenReturn(false);

        MatchSummaryDto summary = new MatchSummaryDto("NA1_1", "Ahri", 10, 2, 8, true, 1800L, 1700000000000L,
                18, 4, 14, new int[7], 150, 30, 420, 30, List.of(), List.of(),
                8005, 8200, new int[4], 0, 15000, 12000);

        service.persistMatchRecords("puuid", "NA", List.of(summary));

        verify(matchRecordRepository).save(any(MatchRecord.class));
    }

    @Test
    void persistMatchRecords_skipsDuplicates() {
        when(matchRecordRepository.existsByPuuidAndMatchId("puuid", "NA1_1")).thenReturn(true);

        MatchSummaryDto summary = new MatchSummaryDto("NA1_1", "Ahri", 10, 2, 8, true, 1800L, 1700000000000L,
                18, 4, 14, new int[7], 150, 30, 420, 30, List.of(), List.of(),
                8005, 8200, new int[4], 0, 15000, 12000);

        service.persistMatchRecords("puuid", "NA", List.of(summary));

        verify(matchRecordRepository, never()).save(any());
    }

    // =====================================================
    // getChampionStats
    // =====================================================

    @Test
    void getChampionStats_aggregatesCorrectly() {
        List<MatchRecord> records = List.of(
            makeRecord("NA1_1", "Ahri", 10, 2, 8, true, 1000L),
            makeRecord("NA1_2", "Ahri", 5, 5, 3, false, 2000L),
            makeRecord("NA1_3", "Zed", 15, 1, 2, true, 3000L)
        );
        when(matchRecordRepository.findByPuuidOrderByGameEndTimestampDesc("puuid")).thenReturn(records);

        List<ChampionStatsDto> result = service.getChampionStats("puuid");

        assertEquals(2, result.size());
        // Ahri has 2 games, Zed has 1 - sorted by games desc
        assertEquals("Ahri", result.get(0).championName());
        assertEquals(2, result.get(0).games());
        assertEquals(1, result.get(0).wins());
        assertEquals("Zed", result.get(1).championName());
        assertEquals(1, result.get(1).games());
    }

    @Test
    void getChampionStats_withZeroDeaths_handlesPerfectKda() {
        List<MatchRecord> records = List.of(
            makeRecord("NA1_1", "Ahri", 10, 0, 5, true, 1000L)
        );
        when(matchRecordRepository.findByPuuidOrderByGameEndTimestampDesc("puuid")).thenReturn(records);

        List<ChampionStatsDto> result = service.getChampionStats("puuid");

        assertEquals(1, result.size());
        assertEquals(15.0, result.get(0).avgKda());
    }

    @Test
    void getChampionStats_withEmptyRecords_returnsEmptyList() {
        when(matchRecordRepository.findByPuuidOrderByGameEndTimestampDesc("puuid")).thenReturn(List.of());

        List<ChampionStatsDto> result = service.getChampionStats("puuid");

        assertTrue(result.isEmpty());
    }

    // =====================================================
    // getMatchTrends
    // =====================================================

    @Test
    void getMatchTrends_returnsChronologicalOrder() {
        List<MatchRecord> records = List.of(
            makeRecord("NA1_2", "Ahri", 5, 5, 3, false, 2000L),
            makeRecord("NA1_1", "Zed", 10, 2, 8, true, 1000L)
        );
        when(matchRecordRepository.findByPuuidOrderByGameEndTimestampDesc("puuid")).thenReturn(records);

        List<MatchTrendPointDto> result = service.getMatchTrends("puuid");

        assertEquals(2, result.size());
        // Should be reversed to chronological (oldest first)
        assertEquals("NA1_1", result.get(0).matchId());
        assertEquals("NA1_2", result.get(1).matchId());
    }

    @Test
    void getMatchTrends_calculatesTotalCs() {
        MatchRecord record = makeRecord("NA1_1", "Ahri", 10, 2, 8, true, 1000L);
        record.setTotalMinionsKilled(150);
        record.setNeutralMinionsKilled(30);
        when(matchRecordRepository.findByPuuidOrderByGameEndTimestampDesc("puuid")).thenReturn(List.of(record));

        List<MatchTrendPointDto> result = service.getMatchTrends("puuid");

        assertEquals(180, result.get(0).cs());
    }
}
