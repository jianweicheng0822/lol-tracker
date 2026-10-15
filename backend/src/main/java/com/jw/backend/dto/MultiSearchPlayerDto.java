package com.jw.backend.dto;

import java.util.List;

public record MultiSearchPlayerDto(
        String gameName,
        String tagLine,
        String puuid,
        int profileIconId,
        List<RankedEntryDto> rankedEntries,
        /** Most-played champions by mastery; empty when unavailable. */
        List<ChampionMasteryDto> topChampions,
        String error
) {}
