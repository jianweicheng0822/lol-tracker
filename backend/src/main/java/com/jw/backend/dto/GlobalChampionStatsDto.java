package com.jw.backend.dto;

public record GlobalChampionStatsDto(
        String championName,
        int games,
        int wins,
        double winRate,
        double pickRate,
        double avgKills,
        double avgDeaths,
        double avgAssists,
        double avgKda,
        double avgCs,
        double avgDamage,
        double avgGold
) {}
