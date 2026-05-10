/**
 * @file MatchDetailParticipantDto.java
 * @description DTO for detailed participant statistics in a match detail view.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Comprehensive participant data from a Match-v5 response.
 *
 * <p>Fields map directly to the Riot Match-v5 participant schema, providing
 * all data needed for the match detail scoreboard UI.</p>
 *
 * @param summonerName               the player's display name
 * @param riotIdTagline              the player's tag line
 * @param championName               the champion played
 * @param puuid                      the player's unique identifier
 * @param teamId                     team assignment (100 = blue, 200 = red)
 * @param kills                      total kills
 * @param deaths                     total deaths
 * @param assists                    total assists
 * @param championLevel              champion level at game end
 * @param totalDamageDealtToChampions damage dealt to champions
 * @param totalDamageTaken           total damage taken
 * @param goldEarned                 total gold earned
 * @param items                      item slot IDs (indices 0-6)
 * @param totalMinionsKilled         lane minions killed
 * @param neutralMinionsKilled       jungle monsters killed
 * @param summoner1Id                first summoner spell ID
 * @param summoner2Id                second summoner spell ID
 * @param primaryRuneId              keystone rune ID
 * @param secondaryRuneStyleId       secondary rune tree ID
 * @param wardsPlaced                total wards placed
 * @param wardsKilled                total enemy wards destroyed
 * @param visionWardsBoughtInGame    control wards purchased
 * @param doubleKills                double kill count
 * @param tripleKills                triple kill count
 * @param quadraKills                quadra kill count
 * @param pentaKills                 penta kill count
 * @param win                        whether this participant won
 * @param placement                  placement in Arena/TFT modes
 * @param playerSubteamId            sub-team ID for Arena mode
 */
public record MatchDetailParticipantDto(
        String summonerName,
        String riotIdTagline,
        String championName,
        String puuid,
        int teamId,
        int kills,
        int deaths,
        int assists,
        int championLevel,
        int totalDamageDealtToChampions,
        int totalDamageTaken,
        int goldEarned,
        int[] items,
        int totalMinionsKilled,
        int neutralMinionsKilled,
        int summoner1Id,
        int summoner2Id,
        int primaryRuneId,
        int secondaryRuneStyleId,
        int wardsPlaced,
        int wardsKilled,
        int visionWardsBoughtInGame,
        int doubleKills,
        int tripleKills,
        int quadraKills,
        int pentaKills,
        boolean win,
        int placement,
        int playerSubteamId
) {}
