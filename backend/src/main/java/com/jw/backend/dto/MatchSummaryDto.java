package com.jw.backend.dto;

import java.util.List;

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
        List<MatchParticipantDto> enemies
) {}
