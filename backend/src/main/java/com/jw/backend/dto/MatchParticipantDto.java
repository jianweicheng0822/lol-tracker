package com.jw.backend.dto;

/** Lightweight participant info (name, champion, puuid) used in match summary ally/enemy lists. */
public record MatchParticipantDto(String summonerName, String riotIdTagline, String championName, String puuid) {}
