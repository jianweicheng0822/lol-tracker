package com.jw.backend.dto;

/**
 * DTO containing aggregated player statistics.
 * Calculated from recent match history.
 */
public record PlayerStatsDto(
    int totalGames,
    int wins,
    int losses,
    double winRate,          // e.g., 60.0 for 60%
    double averageKills,
    double averageDeaths,
    double averageAssists,
    double averageKda        // (kills + assists) / deaths
) {}
