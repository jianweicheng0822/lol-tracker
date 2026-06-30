package com.jw.backend.dto;

/**
 * Enriched summoner account data returned from Riot ID lookups.
 *
 * @param puuid         the player's unique identifier
 * @param gameName      the player's game name (before the #)
 * @param tagLine       the player's tag line (after the #)
 * @param profileIconId the player's profile icon identifier
 */
public record SummonerDto(
        String puuid,
        String gameName,
        String tagLine,
        int profileIconId
) {}
