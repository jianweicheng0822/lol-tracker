package com.jw.backend.service;

import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.PlayerStatsDto;
import com.jw.backend.region.RiotRegion;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service that calculates player statistics from match history.
 */
@Service
public class StatsService {

    private final RiotApiService riotApiService;

    public StatsService(RiotApiService riotApiService) {
        this.riotApiService = riotApiService;
    }

    /**
     * Calculate player stats from their recent matches.
     *
     * @param puuid  Player's unique ID
     * @param region Player's region
     * @param count  Number of matches to analyze
     * @return Aggregated player statistics
     */
    public PlayerStatsDto calculateStats(String puuid, RiotRegion region, int count) {
        // Get recent match summaries
        List<MatchSummaryDto> matches = riotApiService.getRecentMatchSummaries(puuid, region, count);

        // Handle edge case: no matches found
        if (matches.isEmpty()) {
            return new PlayerStatsDto(0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0);
        }

        // Calculate totals
        int totalGames = matches.size();
        int wins = 0;
        int totalKills = 0;
        int totalDeaths = 0;
        int totalAssists = 0;

        for (MatchSummaryDto match : matches) {
            if (match.win()) {
                wins++;
            }
            totalKills += match.kills();
            totalDeaths += match.deaths();
            totalAssists += match.assists();
        }

        // Calculate derived stats
        int losses = totalGames - wins;
        double winRate = (double) wins / totalGames * 100;
        double avgKills = (double) totalKills / totalGames;
        double avgDeaths = (double) totalDeaths / totalGames;
        double avgAssists = (double) totalAssists / totalGames;

        // Calculate KDA: (kills + assists) / deaths
        // Avoid division by zero - if no deaths, use kills + assists as KDA
        double avgKda;
        if (totalDeaths == 0) {
            avgKda = totalKills + totalAssists; // Perfect KDA
        } else {
            avgKda = (double) (totalKills + totalAssists) / totalDeaths;
        }

        // Round to 1 decimal place for cleaner display
        winRate = Math.round(winRate * 10) / 10.0;
        avgKills = Math.round(avgKills * 10) / 10.0;
        avgDeaths = Math.round(avgDeaths * 10) / 10.0;
        avgAssists = Math.round(avgAssists * 10) / 10.0;
        avgKda = Math.round(avgKda * 100) / 100.0;

        return new PlayerStatsDto(
            totalGames,
            wins,
            losses,
            winRate,
            avgKills,
            avgDeaths,
            avgAssists,
            avgKda
        );
    }
}