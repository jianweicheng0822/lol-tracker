/**
 * @file MatchTrendPointDto.java
 * @description DTO for individual match data points consumed by trend line charts.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Single data point for trend line charts, representing one game.
 *
 * <p>Records are ordered oldest-first by the service layer for left-to-right
 * chronological chart rendering.</p>
 *
 * @param matchId                    the Riot match identifier
 * @param gameEndTimestamp           epoch milliseconds when the game ended
 * @param win                        whether the player won
 * @param kills                      total kills
 * @param deaths                     total deaths
 * @param assists                    total assists
 * @param totalDamageDealtToChampions damage dealt to champions
 * @param goldEarned                 total gold earned
 * @param cs                         combined CS (lane minions + neutral monsters)
 * @param championName               the champion played
 * @param queueId                    the queue type ID
 */
public record MatchTrendPointDto(
        String matchId,
        long gameEndTimestamp,
        boolean win,
        int kills,
        int deaths,
        int assists,
        int totalDamageDealtToChampions,
        int goldEarned,
        int cs,
        String championName,
        int queueId
) {}
