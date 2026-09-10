package com.jw.backend.dto;

import java.time.Instant;

public record SearchHistoryResponse(
    String gameName,
    String tagLine,
    String region,
    Instant searchedAt
) {}
