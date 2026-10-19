package com.jw.backend.util;

import com.jw.backend.region.RiotRegion;

/**
 * Checks the player fields clients send when saving a favorite or a search-history entry.
 *
 * <p>The limits are generous next to Riot's own (game names are at most 16 characters, tags 5)
 * but keep values inside the database columns, so a bad request is a 400 instead of a failed
 * insert (500).</p>
 */
public final class PlayerFields {

    private static final int MAX_GAME_NAME = 64;
    private static final int MAX_TAG_LINE = 16;
    private static final int MAX_PUUID = 100;

    private PlayerFields() {
    }

    /** The problem with a Riot ID and region, or null if they're fine. */
    public static String invalidRiotId(String gameName, String tagLine, String region) {
        if (gameName.isBlank() || tagLine.isBlank()) return "gameName and tagLine must not be empty";
        if (gameName.length() > MAX_GAME_NAME || tagLine.length() > MAX_TAG_LINE) return "gameName or tagLine is too long";
        try {
            RiotRegion.valueOf(region);
        } catch (IllegalArgumentException e) {
            return "Unknown region: " + region;
        }
        return null;
    }

    /** The problem with a PUUID, or null if it's fine. */
    public static String invalidPuuid(String puuid) {
        return puuid.matches("[A-Za-z0-9_-]{1," + MAX_PUUID + "}") ? null : "Invalid puuid";
    }
}
