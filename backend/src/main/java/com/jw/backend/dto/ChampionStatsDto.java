package com.jw.backend.dto;

/**
 * Aggregated performance stats for a single champion across all recorded matches.
 * Returned by GET /api/trends/champions for the Champions tab grid.
 * Values are pre-rounded server-side for direct display (e.g., avgKda to 2 decimals).
 */
public record ChampionStatsDto(
        String championName,   // Champion internal name (e.g., "Ahri") — used as DDragon icon key
        int games,             // Total games played on this champion
        int wins,              // Total wins
        double winRate,        // Win rate percentage (0–100), rounded to 1 decimal
        double avgKills,       // Average kills per game
        double avgDeaths,      // Average deaths per game
        double avgAssists,     // Average assists per game
        double avgKda,         // Average KDA ratio ((K+A)/D), rounded to 2 decimals
        double avgDamage,      // Average damage to champions per game
        double avgCs           // Average CS (minions + jungle monsters) per game
) {}
