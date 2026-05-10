/**
 * @file LpSnapshotDto.java
 * @description DTO for LP history data points used in trend charts.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Immutable LP snapshot data point for chart rendering.
 *
 * @param queueType    the ranked queue (e.g., "RANKED_SOLO_5x5")
 * @param tier         the player's tier (e.g., "GOLD")
 * @param rankDivision the division within the tier (e.g., "II")
 * @param leaguePoints current LP within the division
 * @param capturedAt   epoch milliseconds matching Riot's timestamp format
 */
public record LpSnapshotDto(
        String queueType,
        String tier,
        String rankDivision,
        int leaguePoints,
        long capturedAt
) {}
