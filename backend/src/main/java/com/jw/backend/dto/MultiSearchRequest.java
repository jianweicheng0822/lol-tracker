package com.jw.backend.dto;

import java.util.List;

public record MultiSearchRequest(
        List<String> players,
        String region
) {}
