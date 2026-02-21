package com.jw.backend.dto;

/** Detailed per-player stats for the match detail scoreboard (damage, gold, wards, multi-kills). */
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
        boolean win
) {}
