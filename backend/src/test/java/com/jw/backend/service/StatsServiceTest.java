/**
 * @file StatsServiceTest.java
 * @description Unit tests for the player statistics calculation service.
 * @module backend.test
 */
package com.jw.backend.service;

import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.PlayerStatsDto;
import com.jw.backend.region.RiotRegion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Validate the {@link StatsService} for computing win rate, average KDA, and
 * handling edge cases like zero matches and perfect KDA.
 */
@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock
    private RiotApiService riotApiService;

    private StatsService statsService;

    @BeforeEach
    void setUp() {
        statsService = new StatsService(riotApiService);
    }

    private MatchSummaryDto match(int kills, int deaths, int assists, boolean win) {
        return match(kills, deaths, assists, win, 420);
    }

    private MatchSummaryDto match(int kills, int deaths, int assists, boolean win, int queueId) {
        return new MatchSummaryDto("NA1_1", "Ahri", kills, deaths, assists, win, 1800L, 1700000000000L,
                18, 4, 14, new int[7], 150, 30, queueId, 30, List.of(), List.of(),
                8005, 8200, new int[4], 0, 15000, 12000, "MIDDLE");
    }

    /** Verify that only Ranked Solo/Duo and Flex games are counted (Arena, ARAM, etc. are excluded). */
    @Test
    void calculateStats_countsOnlyRankedQueues() {
        List<MatchSummaryDto> matches = List.of(
            match(10, 2, 8, true, 420),   // Ranked Solo/Duo
            match(5, 5, 3, false, 440),   // Ranked Flex
            match(20, 0, 5, true, 1750),  // Arena
            match(15, 1, 30, true, 450)   // ARAM
        );
        when(riotApiService.getRecentMatchSummaries("puuid", RiotRegion.NA, 20)).thenReturn(matches);

        PlayerStatsDto result = statsService.calculateStats("puuid", RiotRegion.NA, 20);

        assertEquals(2, result.totalGames());
        assertEquals(1, result.wins());
        assertEquals(50.0, result.winRate());
        assertEquals(7.5, result.averageKills());
    }

    /** Verify that stats are calculated correctly for multiple matches. */
    @Test
    void calculateStats_withMatches_returnsCorrectStats() {
        List<MatchSummaryDto> matches = List.of(
            match(10, 2, 8, true),
            match(5, 5, 3, false),
            match(8, 1, 10, true)
        );
        when(riotApiService.getRecentMatchSummaries("puuid", RiotRegion.NA, 3)).thenReturn(matches);

        PlayerStatsDto result = statsService.calculateStats("puuid", RiotRegion.NA, 3);

        assertEquals(3, result.totalGames());
        assertEquals(2, result.wins());
        assertEquals(1, result.losses());
        assertEquals(66.7, result.winRate());
        assertEquals(7.7, result.averageKills());
        assertEquals(2.7, result.averageDeaths());
        assertEquals(7.0, result.averageAssists());
    }

    /** Verify that zero matches produce all-zero statistics. */
    @Test
    void calculateStats_withNoMatches_returnsZeros() {
        when(riotApiService.getRecentMatchSummaries("puuid", RiotRegion.NA, 10)).thenReturn(List.of());

        PlayerStatsDto result = statsService.calculateStats("puuid", RiotRegion.NA, 10);

        assertEquals(0, result.totalGames());
        assertEquals(0, result.wins());
        assertEquals(0.0, result.winRate());
        assertEquals(0.0, result.averageKda());
    }

    /** Verify that zero deaths produce a perfect KDA (kills + assists). */
    @Test
    void calculateStats_withZeroDeaths_returnsPerfectKda() {
        List<MatchSummaryDto> matches = List.of(match(10, 0, 5, true));
        when(riotApiService.getRecentMatchSummaries("puuid", RiotRegion.NA, 1)).thenReturn(matches);

        PlayerStatsDto result = statsService.calculateStats("puuid", RiotRegion.NA, 1);

        assertEquals(15.0, result.averageKda());
    }
}
