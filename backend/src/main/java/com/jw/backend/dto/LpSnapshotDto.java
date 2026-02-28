package com.jw.backend.dto;

public record LpSnapshotDto(
        String queueType,
        String tier,
        String rankDivision,
        int leaguePoints,
        long capturedAt
) {}
