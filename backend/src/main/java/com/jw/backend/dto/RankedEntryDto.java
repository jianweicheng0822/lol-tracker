package com.jw.backend.dto;

public record RankedEntryDto(
        String queueType,
        String tier,
        String rank,
        int leaguePoints,
        int wins,
        int losses
) {}
