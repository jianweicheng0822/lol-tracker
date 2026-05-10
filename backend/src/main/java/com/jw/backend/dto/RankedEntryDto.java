/**
 * @file RankedEntryDto.java
 * @description DTO for a player's ranked queue entry with tier, rank, and LP data.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Ranked queue entry representing a player's standing in a specific queue.
 *
 * @param queueType    the ranked queue (e.g., "RANKED_SOLO_5x5", "RANKED_FLEX_SR")
 * @param tier         the player's tier (e.g., "GOLD", "PLATINUM")
 * @param rank         the division within the tier (e.g., "I", "II")
 * @param leaguePoints current LP within the division
 * @param wins         total ranked wins in this queue
 * @param losses       total ranked losses in this queue
 */
public record RankedEntryDto(
        String queueType,
        String tier,
        String rank,
        int leaguePoints,
        int wins,
        int losses
) {}
