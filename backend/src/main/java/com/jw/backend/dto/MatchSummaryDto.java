package com.jw.backend.dto;

public record MatchSummaryDto(
        String matchId,
        String championName,
        int kills,
        int deaths,
        int assists,
        boolean win,
        long gameDurationSec,
        long gameEndTimestamp
) {}