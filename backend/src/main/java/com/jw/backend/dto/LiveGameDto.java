package com.jw.backend.dto;

import java.util.List;

public record LiveGameDto(
        long gameId,
        String gameMode,
        long gameStartTime,
        long gameLength,
        List<LiveGameParticipantDto> participants
) {}
