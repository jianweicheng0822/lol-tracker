/**
 * @file StatsService.java
 * @description Service for computing aggregate player statistics from live match data.
 * @module backend.service
 */
package com.jw.backend.service;

import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.PlayerStatsDto;
import com.jw.backend.region.RiotRegion;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * Reduce live Match-v5 data into the overview tab's aggregate statistics.
 *
 * <p>Computes win rate, average KDA, and other key metrics from the player's
 * most recent matches fetched in real-time from the Riot API.</p>
 */
@Service
public class StatsService {

    private final RiotApiService riotApiService;

    /**
     * Construct the service with the Riot API service dependency.
     *
     * @param riotApiService service for fetching match data from Riot API
     */
    public StatsService(RiotApiService riotApiService) {
        this.riotApiService = riotApiService;
    }

    /** Ranked Solo/Duo and Ranked Flex — the only queues counted in overview stats. */
    private static final Set<Integer> RANKED_QUEUE_IDS = Set.of(420, 440);

    /**
     * Calculate aggregate statistics from the ranked games among a player's recent matches.
     *
     * <p>Only Ranked Solo/Duo and Ranked Flex games count, so modes like Arena or ARAM don't
     * skew win rate and KDA; {@code totalGames} may therefore be lower than {@code count}.
     * Returns zeroed stats if there are no ranked games. KDA calculation uses the convention
     * that perfect KDA (0 deaths) reports the raw sum of kills and assists rather than infinity.</p>
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot routing region
     * @param count  number of recent matches (all queues) to consider
     * @return aggregated statistics including win rate, KDA, and per-game averages
     */
    public PlayerStatsDto calculateStats(String puuid, RiotRegion region, int count) {
        List<MatchSummaryDto> matches = riotApiService.getRecentMatchSummaries(puuid, region, count).stream()
                .filter(m -> RANKED_QUEUE_IDS.contains(m.queueId()))
                .toList();

        if (matches.isEmpty()) {
            return new PlayerStatsDto(0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0);
        }

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

        int losses = totalGames - wins;
        double winRate = (double) wins / totalGames * 100;
        double avgKills = (double) totalKills / totalGames;
        double avgDeaths = (double) totalDeaths / totalGames;
        double avgAssists = (double) totalAssists / totalGames;

        // Convention: perfect KDA (0 deaths) reports raw sum rather than infinity
        double avgKda;
        if (totalDeaths == 0) {
            avgKda = totalKills + totalAssists;
        } else {
            avgKda = (double) (totalKills + totalAssists) / totalDeaths;
        }

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
