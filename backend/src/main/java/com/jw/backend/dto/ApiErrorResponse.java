/**
 * @file ApiErrorResponse.java
 * @description DTO for standardized API error responses.
 * @module backend.dto
 */
package com.jw.backend.dto;

import java.time.Instant;

/**
 * RFC 7807-inspired error envelope consumed by the frontend error interceptor.
 *
 * @param timestamp when the error occurred
 * @param status    HTTP status code
 * @param error     HTTP status reason phrase
 * @param message   human-readable error description
 * @param path      the request URI that triggered the error
 */
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {}
