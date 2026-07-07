package com.jw.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.LeaderboardEntryDto;
import com.jw.backend.region.RiotRegion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

    @Mock
    private RiotApiService riotApiService;

    private LeaderboardService leaderboardService;

    @BeforeEach
    void setUp() {
        leaderboardService = new LeaderboardService(riotApiService, new ObjectMapper());
    }

    @Test
    void getLeaderboard_parsesEntriesAndSortsByLpDescending() {
        String json = """
            {
                "tier": "CHALLENGER",
                "entries": [
                    {"puuid": "p1", "summonerName": "Player1", "rank": "I", "leaguePoints": 500, "wins": 100, "losses": 50},
                    {"puuid": "p2", "summonerName": "Player2", "rank": "I", "leaguePoints": 1200, "wins": 200, "losses": 80},
                    {"puuid": "p3", "summonerName": "Player3", "rank": "I", "leaguePoints": 800, "wins": 150, "losses": 100}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn(json);

        var result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA, 0, 50);
        List<LeaderboardEntryDto> entries = result.entries();

        assertEquals(3, entries.size());
        assertEquals(3, result.totalEntries());
        assertEquals(1200, entries.get(0).leaguePoints());
        assertEquals("p2", entries.get(0).puuid());
        assertEquals(800, entries.get(1).leaguePoints());
        assertEquals(500, entries.get(2).leaguePoints());
    }

    @Test
    void getLeaderboard_computesWinRateCorrectly() {
        String json = """
            {
                "tier": "GRANDMASTER",
                "entries": [
                    {"puuid": "p1", "summonerName": "HighWR", "rank": "I", "leaguePoints": 600, "wins": 80, "losses": 20},
                    {"puuid": "p2", "summonerName": "LowWR", "rank": "I", "leaguePoints": 400, "wins": 30, "losses": 70}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("grandmaster", "RANKED_SOLO_5x5", RiotRegion.KR)).thenReturn(json);

        var result = leaderboardService.getLeaderboard("grandmaster", "RANKED_SOLO_5x5", RiotRegion.KR, 0, 50);

        assertEquals(80.0, result.entries().get(0).winRate());
        assertEquals(30.0, result.entries().get(1).winRate());
    }

    @Test
    void getLeaderboard_setsCorrectTier() {
        String json = """
            {
                "tier": "MASTER",
                "entries": [
                    {"puuid": "p1", "summonerName": "P1", "rank": "I", "leaguePoints": 100, "wins": 50, "losses": 50}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("master", "RANKED_SOLO_5x5", RiotRegion.EUW)).thenReturn(json);

        var result = leaderboardService.getLeaderboard("master", "RANKED_SOLO_5x5", RiotRegion.EUW, 0, 50);

        assertEquals(1, result.entries().size());
        assertEquals("MASTER", result.entries().get(0).tier());
        assertEquals("I", result.entries().get(0).rank());
    }

    @Test
    void getLeaderboard_withEmptyEntries_returnsEmptyList() {
        String json = """
            {
                "tier": "CHALLENGER",
                "entries": []
            }
            """;
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn(json);

        var result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA, 0, 50);

        assertTrue(result.entries().isEmpty());
        assertEquals(0, result.totalEntries());
    }

    @Test
    void getLeaderboard_withZeroGames_winRateIsZero() {
        String json = """
            {
                "tier": "CHALLENGER",
                "entries": [
                    {"puuid": "p1", "summonerName": "NoGames", "rank": "I", "leaguePoints": 0, "wins": 0, "losses": 0}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn(json);

        var result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA, 0, 50);

        assertEquals(0.0, result.entries().get(0).winRate());
    }

    @Test
    void getLeaderboard_withInvalidJson_throwsException() {
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn("not json");

        assertThrows(RuntimeException.class, () ->
            leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA, 0, 50));
    }

    @Test
    void getLeaderboard_withMissingFields_usesDefaults() {
        String json = """
            {
                "tier": "CHALLENGER",
                "entries": [
                    {"leaguePoints": 300}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn(json);

        var result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA, 0, 50);

        assertEquals("Unknown", result.entries().get(0).summonerName());
        assertEquals("I", result.entries().get(0).rank());
        assertEquals(0, result.entries().get(0).wins());
        assertEquals(0, result.entries().get(0).losses());
    }

    @Test
    void getLeaderboard_paginatesCorrectly() {
        String json = """
            {
                "tier": "CHALLENGER",
                "entries": [
                    {"puuid": "p1", "summonerName": "A", "rank": "I", "leaguePoints": 500, "wins": 10, "losses": 5},
                    {"puuid": "p2", "summonerName": "B", "rank": "I", "leaguePoints": 400, "wins": 10, "losses": 5},
                    {"puuid": "p3", "summonerName": "C", "rank": "I", "leaguePoints": 300, "wins": 10, "losses": 5}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn(json);

        // page 0, size 2 should return first 2 entries (sorted by LP desc)
        var page0 = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA, 0, 2);
        assertEquals(2, page0.entries().size());
        assertEquals(3, page0.totalEntries());
        assertEquals(500, page0.entries().get(0).leaguePoints());
        assertEquals(400, page0.entries().get(1).leaguePoints());

        // page 1, size 2 should return last entry
        var page1 = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA, 1, 2);
        assertEquals(1, page1.entries().size());
        assertEquals(300, page1.entries().get(0).leaguePoints());
    }
}
