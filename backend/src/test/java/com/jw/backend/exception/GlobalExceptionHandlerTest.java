/**
 * @file GlobalExceptionHandlerTest.java
 * @description Unit tests for specific HTTP client error handling scenarios.
 * @module backend.test
 */
package com.jw.backend.exception;
import com.jw.backend.dto.ApiErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.client.HttpClientErrorException;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Validate the {@link GlobalExceptionHandler} client error handling for Not Found,
 * Unauthorized, and Too Many Requests HTTP status codes.
 */
public class GlobalExceptionHandlerTest {
    private GlobalExceptionHandler handler;
    private MockHttpServletRequest fakeRequest;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        fakeRequest = new MockHttpServletRequest();
        fakeRequest.setRequestURI("/api/summoner");
    }

    /** Verify that a 404 Not Found error returns a user-friendly "not found" message. */
    @Test
    void handleClientError_whenNotFound_returnsUserFriendlyMessage() {
        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.NOT_FOUND, "Not Found", HttpHeaders.EMPTY, null, null
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(exception, fakeRequest);

        assertEquals(404, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("not found"));
    }

    /** Verify that a 401 Unauthorized error returns an API key related message. */
    @Test
    void handleClientError_whenUnauthorized_returnsApiKeyMessage() {
        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.UNAUTHORIZED, "Unauthorized", HttpHeaders.EMPTY, null, null
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(exception, fakeRequest);

        assertEquals(401, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("API key"));
    }

    /** Verify that a 429 Too Many Requests error returns a rate limit message. */
    @Test
    void handleClientError_whenTooManyRequests_returnsRateLimitMessage() {
        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", HttpHeaders.EMPTY, null, null
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(exception, fakeRequest);

        assertEquals(429, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Rate limited"));
    }
}
