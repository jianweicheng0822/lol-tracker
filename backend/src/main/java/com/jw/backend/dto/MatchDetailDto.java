/**
 * @file MatchDetailDto.java
 * @description DTO for normalized match detail data grouped by team for scoreboard rendering.
 * @module backend.dto
 */
package com.jw.backend.dto;

import java.util.List;

/**
 * Normalized view of Riot's Match-v5 response with team and participant groupings.
 *
 * @param matchId          the Riot match identifier
 * @param queueId          the queue type ID
 * @param gameDurationSec  game length in seconds
 * @param gameEndTimestamp  epoch milliseconds when the game ended
 * @param gameMode         the game mode string (e.g., "CLASSIC")
 * @param gameVersion      the patch version the game was played on
 * @param teams            team-level data with objectives and ban information
 * @param participants     all participant detail records
 */
public record MatchDetailDto(
        String matchId,
        int queueId,
        long gameDurationSec,
        long gameEndTimestamp,
        String gameMode,
        String gameVersion,
        List<TeamDto> teams,
        List<MatchDetailParticipantDto> participants
) {
    /**
     * Team-level data including win/loss, bans, and objective takedowns.
     *
     * @param teamId     Riot team identifier (100 = blue, 200 = red)
     * @param win        whether this team won
     * @param bans       list of banned champion IDs
     * @param objectives objective kill counts for the team
     */
    public record TeamDto(
            int teamId,
            boolean win,
            List<Integer> bans,
            ObjectivesDto objectives
    ) {}

    /**
     * Team objective takedown counts.
     *
     * @param baronKills  number of Baron Nashor kills
     * @param dragonKills number of Dragon kills
     * @param towerKills  number of tower destructions
     */
    public record ObjectivesDto(
            int baronKills,
            int dragonKills,
            int towerKills
    ) {}
}
