package com.jw.backend.dto;

import java.util.List;

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
    public record TeamDto(
            int teamId,
            boolean win,
            List<Integer> bans,
            ObjectivesDto objectives
    ) {}

    public record ObjectivesDto(
            int baronKills,
            int dragonKills,
            int towerKills
    ) {}
}
