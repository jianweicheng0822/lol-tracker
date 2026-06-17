package com.jw.backend.service;

import com.jw.backend.dto.GlobalChampionStatsDto;
import com.jw.backend.dto.GlobalOverviewDto;
import com.jw.backend.repository.MatchRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GlobalStatsServiceTest {

    @Mock
    private MatchRecordRepository matchRecordRepository;

    private GlobalStatsService globalStatsService;

    @BeforeEach
    void setUp() {
        globalStatsService = new GlobalStatsService(matchRecordRepository);
    }

    private List<Object[]> rowList(Object[]... rows) {
        List<Object[]> list = new ArrayList<>();
        for (Object[] row : rows) {
            list.add(row);
        }
        return list;
    }

    @Test
    void getGlobalChampionStats_computesWinRateAndPickRate() {
        Object[] ahriRow = new Object[]{"Ahri", 40L, 24L, 5.5, 3.0, 8.0, 180.0, 15000.0, 11000.0};
        when(matchRecordRepository.aggregateChampionStats(null)).thenReturn(rowList(ahriRow));
        when(matchRecordRepository.countDistinctMatches(null)).thenReturn(200L);

        List<GlobalChampionStatsDto> result = globalStatsService.getGlobalChampionStats(null);

        assertEquals(1, result.size());
        GlobalChampionStatsDto ahri = result.get(0);
        assertEquals("Ahri", ahri.championName());
        assertEquals(40, ahri.games());
        assertEquals(24, ahri.wins());
        assertEquals(60.0, ahri.winRate());
        assertEquals(20.0, ahri.pickRate());  // 40/200 * 100
        assertEquals(5.5, ahri.avgKills());
        assertEquals(3.0, ahri.avgDeaths());
        assertEquals(8.0, ahri.avgAssists());
        assertEquals(4.5, ahri.avgKda());     // (5.5 + 8.0) / 3.0
    }

    @Test
    void getGlobalChampionStats_withQueueFilter_passesFilterToRepo() {
        when(matchRecordRepository.aggregateChampionStats(420)).thenReturn(List.of());
        when(matchRecordRepository.countDistinctMatches(420)).thenReturn(0L);

        List<GlobalChampionStatsDto> result = globalStatsService.getGlobalChampionStats(420);

        assertTrue(result.isEmpty());
        verify(matchRecordRepository).aggregateChampionStats(420);
        verify(matchRecordRepository).countDistinctMatches(420);
    }

    @Test
    void getGlobalChampionStats_zeroDeaths_returnsKillsPlusAssists() {
        Object[] row = new Object[]{"Yuumi", 10L, 8L, 2.0, 0.0, 15.0, 20.0, 5000.0, 8000.0};
        when(matchRecordRepository.aggregateChampionStats(null)).thenReturn(rowList(row));
        when(matchRecordRepository.countDistinctMatches(null)).thenReturn(100L);

        List<GlobalChampionStatsDto> result = globalStatsService.getGlobalChampionStats(null);

        assertEquals(17.0, result.get(0).avgKda());  // (2.0 + 15.0) / 0 -> 17.0
    }

    @Test
    void getGlobalChampionStats_zeroTotalMatches_pickRateIsZero() {
        Object[] row = new Object[]{"Aatrox", 5L, 3L, 6.0, 4.0, 5.0, 190.0, 20000.0, 13000.0};
        when(matchRecordRepository.aggregateChampionStats(null)).thenReturn(rowList(row));
        when(matchRecordRepository.countDistinctMatches(null)).thenReturn(0L);

        List<GlobalChampionStatsDto> result = globalStatsService.getGlobalChampionStats(null);

        assertEquals(0.0, result.get(0).pickRate());
    }

    @Test
    void getGlobalChampionStats_multipleChampions_returnedInOrder() {
        Object[] row1 = new Object[]{"Ahri", 50L, 30L, 5.0, 3.0, 7.0, 170.0, 14000.0, 10000.0};
        Object[] row2 = new Object[]{"Zed", 30L, 18L, 9.0, 4.0, 3.0, 210.0, 22000.0, 13000.0};
        Object[] row3 = new Object[]{"Lux", 20L, 10L, 3.0, 2.5, 12.0, 160.0, 16000.0, 9000.0};
        when(matchRecordRepository.aggregateChampionStats(null)).thenReturn(rowList(row1, row2, row3));
        when(matchRecordRepository.countDistinctMatches(null)).thenReturn(100L);

        List<GlobalChampionStatsDto> result = globalStatsService.getGlobalChampionStats(null);

        assertEquals(3, result.size());
        assertEquals("Ahri", result.get(0).championName());
        assertEquals("Zed", result.get(1).championName());
        assertEquals("Lux", result.get(2).championName());
    }

    @Test
    void getOverviewStats_returnsTotals() {
        when(matchRecordRepository.countDistinctMatches(null)).thenReturn(500L);
        when(matchRecordRepository.countDistinctPlayers()).thenReturn(15L);
        when(matchRecordRepository.countDistinctChampions()).thenReturn(90L);

        GlobalOverviewDto overview = globalStatsService.getOverviewStats();

        assertEquals(500, overview.totalMatches());
        assertEquals(15, overview.totalPlayers());
        assertEquals(90, overview.totalChampions());
    }
}
