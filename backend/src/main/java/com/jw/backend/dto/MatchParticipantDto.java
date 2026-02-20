package com.jw.backend.dto;

/** Lightweight participant info (name, champion, puuid) used in match summary ally/enemy lists. */
public record MatchParticipantDto(String summonerName, String championName, String puuid) {}
