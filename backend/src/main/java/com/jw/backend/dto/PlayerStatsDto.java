/**
 * @file PlayerStatsDto.java
 * @description DTO for aggregate player statistics displayed on the overview tab.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Aggregate player statistics computed from recent match history.
 *
 * <p>Win rate uses a 0-100 scale. KDA uses the "perfect KDA" convention where
 * 0 deaths reports the raw sum of kills + assists.</p>
 *
 * @param totalGames     number of games included in the calculation
 * @param wins           total wins
 * @param losses         total losses
 * @param winRate        win percentage (0-100 scale)
 * @param averageKills   average kills per game
 * @param averageDeaths  average deaths per game
 * @param averageAssists average assists per game
 * @param averageKda     average KDA ratio
 */
public record PlayerStatsDto(
    int totalGames,
    int wins,
    int losses,
    double winRate,
    double averageKills,
    double averageDeaths,
    double averageAssists,
    double averageKda
) {}
