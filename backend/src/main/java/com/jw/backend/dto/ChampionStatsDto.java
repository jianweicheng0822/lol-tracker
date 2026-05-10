/**
 * @file ChampionStatsDto.java
 * @description DTO for pre-aggregated per-champion performance statistics.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Aggregated statistics for a single champion across multiple games.
 *
 * @param championName the champion's display name
 * @param games        total number of games played
 * @param wins         total wins
 * @param winRate      win percentage (0-100 scale)
 * @param avgKills     average kills per game
 * @param avgDeaths    average deaths per game
 * @param avgAssists   average assists per game
 * @param avgKda       average KDA ratio
 * @param avgDamage    average damage dealt to champions per game
 * @param avgCs        average combined CS (minions + neutral monsters) per game
 */
public record ChampionStatsDto(
        String championName,
        int games,
        int wins,
        double winRate,
        double avgKills,
        double avgDeaths,
        double avgAssists,
        double avgKda,
        double avgDamage,
        double avgCs
) {}
