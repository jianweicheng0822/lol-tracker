package com.jw.backend.dto;

/**
 * A single data point for per-match performance trend charts.
 * Returned by GET /api/trends/matches in chronological order (oldest first).
 * Each point represents one game and is plotted on KDA, damage, and win-rate charts.
 */
public record MatchTrendPointDto(
        String matchId,                    // Riot match ID
        long gameEndTimestamp,             // Epoch ms — X-axis for time-based charts
        boolean win,                       // Win/loss — used for rolling win rate calculation
        int kills,
        int deaths,
        int assists,
        int totalDamageDealtToChampions,   // Damage dealt — for damage/game chart
        int goldEarned,                    // Gold earned — for economy tracking
        int cs,                            // Total CS (minions + jungle monsters combined)
        String championName,               // Champion played
        int queueId                        // Queue type for optional filtering
) {}
