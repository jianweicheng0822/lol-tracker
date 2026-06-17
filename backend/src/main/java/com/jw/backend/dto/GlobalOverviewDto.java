package com.jw.backend.dto;

public record GlobalOverviewDto(
        long totalMatches,
        long totalPlayers,
        long totalChampions
) {}
