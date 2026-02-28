package com.jw.backend.dto;

public record ChampionStatsDto(
        String championName,
        int games,
        int wins,
        double winRate,
        double avgKills,
        double avgDeaths,
        double avgAssists,
        double avgKda,
        double avgDamage,
        double avgCs
) {}
