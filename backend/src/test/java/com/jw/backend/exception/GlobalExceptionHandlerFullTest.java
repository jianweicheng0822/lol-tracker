package com.jw.backend.exception;

import com.jw.backend.dto.ApiErrorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerFullTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest fakeRequest;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        fakeRequest = new MockHttpServletRequest();
        fakeRequest.setRequestURI("/api/test");
    }

    @Test
    void handleClientError_forbidden_returnsApiKeyMessage() {
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.FORBIDDEN, "Forbidden", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(ex, fakeRequest);

        assertEquals(403, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("API key"));
    }

    @Test
    void handleClientError_otherStatus_returnsGenericMessage() {
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.BAD_REQUEST, "Bad Request", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Riot API request failed"));
    }

    @Test
    void handleServerError_returnsServerErrorMessage() {
        HttpServerErrorException ex = HttpServerErrorException.create(
                HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleServerError(ex, fakeRequest);

        assertEquals(500, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Riot API server error"));
    }

    @Test
    void handleServerError_502_returnsServerErrorMessage() {
        HttpServerErrorException ex = HttpServerErrorException.create(
                HttpStatus.BAD_GATEWAY, "Bad Gateway", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleServerError(ex, fakeRequest);

        assertEquals(502, response.getStatusCode().value());
    }

    @Test
    void handleMissingParam_returnsBadRequest() throws Exception {
        MissingServletRequestParameterException ex =
                new MissingServletRequestParameterException("puuid", "String");

        ResponseEntity<ApiErrorResponse> response = handler.handleMissingParam(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("puuid"));
    }

    @Test
    void handleTypeMismatch_returnsBadRequest() {
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "INVALID", null, "region", null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleTypeMismatch(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("region"));
    }

    @Test
    void handleRateLimit_returns429() {
        RateLimitException ex = new RateLimitException("Rate limit exceeded");

        ResponseEntity<ApiErrorResponse> response = handler.handleRateLimit(ex, fakeRequest);

        assertEquals(429, response.getStatusCode().value());
        assertEquals("Rate limit exceeded", response.getBody().message());
    }

    @Test
    void handleUnknown_returns500() {
        Exception ex = new RuntimeException("Something broke");

        ResponseEntity<ApiErrorResponse> response = handler.handleUnknown(ex, fakeRequest);

        assertEquals(500, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Unexpected server error"));
        assertEquals("/api/test", response.getBody().path());
    }

    @Test
    void apiErrorResponse_fieldsAreCorrect() {
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.NOT_FOUND, "Not Found", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(ex, fakeRequest);

        ApiErrorResponse body = response.getBody();
        assertNotNull(body.timestamp());
        assertEquals(404, body.status());
        assertEquals("Not Found", body.error());
        assertEquals("/api/test", body.path());
    }
}
