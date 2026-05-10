/**
 * @file MatchSummaryDto.java
 * @description DTO for a player-centric match summary with ally/enemy team split.
 * @module backend.dto
 */
package com.jw.backend.dto;

import java.util.List;

/**
 * Player-centric match view with team participants split relative to the queried PUUID.
 *
 * @param matchId                    the Riot match identifier
 * @param championName               the champion played by the queried player
 * @param kills                      player's total kills
 * @param deaths                     player's total deaths
 * @param assists                    player's total assists
 * @param win                        whether the player won
 * @param gameDurationSec            game length in seconds
 * @param gameEndTimestamp           epoch milliseconds when the game ended
 * @param championLevel              champion level at game end
 * @param summoner1Id                first summoner spell ID
 * @param summoner2Id                second summoner spell ID
 * @param items                      item slot IDs (indices 0-6)
 * @param totalMinionsKilled         lane minions killed
 * @param neutralMinionsKilled       jungle monsters killed
 * @param queueId                    the queue type ID
 * @param teamTotalKills             combined kills from allied team
 * @param allies                     allied team participants (excluding the queried player)
 * @param enemies                    enemy team participants
 * @param primaryRuneId              keystone rune ID
 * @param secondaryRuneStyleId       secondary rune tree ID
 * @param augments                   Arena mode augment IDs
 * @param placement                  placement in Arena/TFT modes
 * @param totalDamageDealtToChampions total damage dealt to champions
 * @param goldEarned                 total gold earned
 */
public record MatchSummaryDto(
        String matchId,
        String championName,
        int kills,
        int deaths,
        int assists,
        boolean win,
        long gameDurationSec,
        long gameEndTimestamp,
        int championLevel,
        int summoner1Id,
        int summoner2Id,
        int[] items,
        int totalMinionsKilled,
        int neutralMinionsKilled,
        int queueId,
        int teamTotalKills,
        List<MatchParticipantDto> allies,
        List<MatchParticipantDto> enemies,
        int primaryRuneId,
        int secondaryRuneStyleId,
        int[] augments,
        int placement,
        int totalDamageDealtToChampions,
        int goldEarned
) {}
