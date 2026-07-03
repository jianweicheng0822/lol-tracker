/**
 * @file LeaderboardEntryDto.java
 * @description Data transfer object for a single ranked leaderboard entry.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Represents a player's position on the ranked leaderboard with their tier, LP, and win/loss record.
 */
public record LeaderboardEntryDto(
        String summonerName,
        String tier,
        String rank,
        int leaguePoints,
        int wins,
        int losses,
        double winRate
) {}
