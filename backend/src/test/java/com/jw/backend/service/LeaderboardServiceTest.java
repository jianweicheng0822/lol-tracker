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
                    {"summonerName": "Player1", "rank": "I", "leaguePoints": 500, "wins": 100, "losses": 50},
                    {"summonerName": "Player2", "rank": "I", "leaguePoints": 1200, "wins": 200, "losses": 80},
                    {"summonerName": "Player3", "rank": "I", "leaguePoints": 800, "wins": 150, "losses": 100}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn(json);

        List<LeaderboardEntryDto> result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        assertEquals(3, result.size());
        assertEquals("Player2", result.get(0).summonerName());
        assertEquals(1200, result.get(0).leaguePoints());
        assertEquals("Player3", result.get(1).summonerName());
        assertEquals(800, result.get(1).leaguePoints());
        assertEquals("Player1", result.get(2).summonerName());
        assertEquals(500, result.get(2).leaguePoints());
    }

    @Test
    void getLeaderboard_computesWinRateCorrectly() {
        String json = """
            {
                "tier": "GRANDMASTER",
                "entries": [
                    {"summonerName": "HighWR", "rank": "I", "leaguePoints": 600, "wins": 80, "losses": 20},
                    {"summonerName": "LowWR", "rank": "I", "leaguePoints": 400, "wins": 30, "losses": 70}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("grandmaster", "RANKED_SOLO_5x5", RiotRegion.KR)).thenReturn(json);

        List<LeaderboardEntryDto> result = leaderboardService.getLeaderboard("grandmaster", "RANKED_SOLO_5x5", RiotRegion.KR);

        assertEquals(80.0, result.get(0).winRate());
        assertEquals(30.0, result.get(1).winRate());
    }

    @Test
    void getLeaderboard_setsCorrectTier() {
        String json = """
            {
                "tier": "MASTER",
                "entries": [
                    {"summonerName": "P1", "rank": "I", "leaguePoints": 100, "wins": 50, "losses": 50}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("master", "RANKED_SOLO_5x5", RiotRegion.EUW)).thenReturn(json);

        List<LeaderboardEntryDto> result = leaderboardService.getLeaderboard("master", "RANKED_SOLO_5x5", RiotRegion.EUW);

        assertEquals(1, result.size());
        assertEquals("MASTER", result.get(0).tier());
        assertEquals("I", result.get(0).rank());
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

        List<LeaderboardEntryDto> result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        assertTrue(result.isEmpty());
    }

    @Test
    void getLeaderboard_withZeroGames_winRateIsZero() {
        String json = """
            {
                "tier": "CHALLENGER",
                "entries": [
                    {"summonerName": "NoGames", "rank": "I", "leaguePoints": 0, "wins": 0, "losses": 0}
                ]
            }
            """;
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn(json);

        List<LeaderboardEntryDto> result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        assertEquals(0.0, result.get(0).winRate());
    }

    @Test
    void getLeaderboard_withInvalidJson_throwsException() {
        when(riotApiService.getLeagueByTier("challenger", "RANKED_SOLO_5x5", RiotRegion.NA)).thenReturn("not json");

        assertThrows(RuntimeException.class, () ->
            leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA));
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

        List<LeaderboardEntryDto> result = leaderboardService.getLeaderboard("challenger", "RANKED_SOLO_5x5", RiotRegion.NA);

        assertEquals("Unknown", result.get(0).summonerName());
        assertEquals("I", result.get(0).rank());
        assertEquals(0, result.get(0).wins());
        assertEquals(0, result.get(0).losses());
    }
}
