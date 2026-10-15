package com.jw.backend.dto;

/** One of a player's most-played champions, from Champion-Mastery-v4. */
public record ChampionMasteryDto(
        int championId,
        int championLevel,
        long championPoints
) {}
