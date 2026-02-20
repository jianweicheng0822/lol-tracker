package com.jw.backend.dto;

import java.time.Instant;

/** Standardized error response body returned by the global exception handler. */
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {}
