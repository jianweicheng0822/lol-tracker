/**
 * @file MatchParticipantDto.java
 * @description DTO for minimal participant identity in match summary lists.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Lightweight participant identity used in match list views.
 *
 * <p>Keeps the match summary payload small by including only the fields
 * needed to render participant names and champion icons.</p>
 *
 * @param summonerName  the player's display name
 * @param riotIdTagline the player's tag line
 * @param championName  the champion played
 * @param puuid         the player's unique identifier
 */
public record MatchParticipantDto(String summonerName, String riotIdTagline, String championName, String puuid) {}
