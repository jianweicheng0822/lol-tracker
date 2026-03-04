package com.jw.backend.dto;

/**
 * A point-in-time LP snapshot for LP progression charts.
 * Returned by GET /api/trends/lp in chronological order (oldest first).
 * The frontend converts tier+rank+LP into a single numeric Y-axis value via toAbsoluteLp().
 */
public record LpSnapshotDto(
        String queueType,    // e.g., "RANKED_SOLO_5x5" or "RANKED_FLEX_SR"
        String tier,         // e.g., "GOLD", "PLATINUM", "DIAMOND"
        String rankDivision, // e.g., "I", "II", "III", "IV" (empty for apex tiers)
        int leaguePoints,    // LP within the division
        long capturedAt      // Epoch ms — when this snapshot was recorded
) {}
