package com.jw.backend.dto;

import java.util.List;

/** Match summary for the match history list — one player's perspective with KDA, items, runes, and team rosters. */
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
        int[] augments, // Arena augment IDs (4 slots)
        int placement // Arena placement (1–8); used for win/loss logic (1–4 = win)
) {}
