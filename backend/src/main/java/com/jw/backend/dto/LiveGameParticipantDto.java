package com.jw.backend.dto;

public record LiveGameParticipantDto(
        String puuid,
        String gameName,
        String tagLine,
        int championId,
        int teamId,
        int spell1Id,
        int spell2Id,
        String tier,
        String rank,
        int leaguePoints,
        int wins,
        int losses,
        double winRate
) {}
