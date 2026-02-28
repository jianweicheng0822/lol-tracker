package com.jw.backend.dto;

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
