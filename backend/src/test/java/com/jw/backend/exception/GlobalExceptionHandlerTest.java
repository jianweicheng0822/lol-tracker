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

public class GlobalExceptionHandlerTest {
    private GlobalExceptionHandler handler;
    private MockHttpServletRequest fakeRequest;
    @BeforeEach
    void setUp() {
        // This runs BEFORE each test
        handler = new GlobalExceptionHandler();
        fakeRequest = new MockHttpServletRequest();
        fakeRequest.setRequestURI("/api/summoner");
    }
    @Test
    void handleClientError_whenNotFound_returnsUserFriendlyMessage() {
        // ARRANGE - Set up the test


        // 1. Create a FAKE 404 exception (as if Riot API returned 404)
        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.NOT_FOUND,    // 404
                "Not Found",             // status text
                HttpHeaders.EMPTY,       // no headers
                null,                    // no body
                null                     // no charset
        );

        // ACT - Call the method we're testing
        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(
                exception,
                fakeRequest
        );

        // ASSERT - Check the results
        assertEquals(404, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("not found"));
    }
    @Test
    void handleClientError_whenUnauthorized_returnsApiKeyMessage() {


        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.UNAUTHORIZED,  // 401
                "Unauthorized",
                HttpHeaders.EMPTY,
                null,
                null
        );


        // ACT
        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(
                exception,
                fakeRequest
        );

        // ASSERT
        assertEquals(401, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("API key"));
    }

    @Test
    void handleClientError_whenTooManyRequests_returnsRateLimitMessage() {
        HttpClientErrorException exception = HttpClientErrorException.create(
                HttpStatus.TOO_MANY_REQUESTS,  // 429
                "Too Many Requests",
                HttpHeaders.EMPTY,
                null,
                null
        );


        // ACT
        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(
                exception,
                fakeRequest
        );

        // ASSERT
        assertEquals(429, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Rate limited"));
    }
}

