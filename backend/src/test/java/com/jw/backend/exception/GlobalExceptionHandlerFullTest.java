/**
 * @file GlobalExceptionHandlerFullTest.java
 * @description Comprehensive unit tests for all global exception handler methods.
 * @module backend.test
 */
package com.jw.backend.exception;

import com.jw.backend.dto.ApiErrorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Validate every handler method in {@link GlobalExceptionHandler} including client errors,
 * server errors, missing parameters, type mismatches, rate limits, and unknown exceptions.
 */
class GlobalExceptionHandlerFullTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest fakeRequest;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        fakeRequest = new MockHttpServletRequest();
        fakeRequest.setRequestURI("/api/test");
    }

    /** Verify that a 403 from Riot (our key) is reported as unavailable. */
    @Test
    void handleClientError_forbidden_returnsUnavailable() {
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.FORBIDDEN, "Forbidden", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(ex, fakeRequest);

        assertEquals(503, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("unavailable"));
    }

    /** Verify that a non-forbidden client error returns a generic Riot API failure message. */
    @Test
    void handleClientError_otherStatus_returnsGenericMessage() {
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.BAD_REQUEST, "Bad Request", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().message().startsWith("Riot didn't accept this request"));
    }

    /** Verify that a 500 server error returns a Riot API server error message. */
    @Test
    void handleServerError_returnsServerErrorMessage() {
        HttpServerErrorException ex = HttpServerErrorException.create(
                HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleServerError(ex, fakeRequest);

        assertEquals(500, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Riot API server error"));
    }

    /** Verify that a 502 Bad Gateway is handled as a server error. */
    @Test
    void handleServerError_502_returnsServerErrorMessage() {
        HttpServerErrorException ex = HttpServerErrorException.create(
                HttpStatus.BAD_GATEWAY, "Bad Gateway", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleServerError(ex, fakeRequest);

        assertEquals(502, response.getStatusCode().value());
    }

    /** Verify that a missing request parameter returns HTTP 400 with the parameter name. */
    @Test
    void handleMissingParam_returnsBadRequest() throws Exception {
        MissingServletRequestParameterException ex =
                new MissingServletRequestParameterException("puuid", "String");

        ResponseEntity<ApiErrorResponse> response = handler.handleMissingParam(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("puuid"));
    }

    /** Verify that a type mismatch returns HTTP 400 with the parameter name. */
    @Test
    void handleTypeMismatch_returnsBadRequest() {
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "INVALID", null, "region", null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleTypeMismatch(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("region"));
    }

    /** Verify that a rate limit exception returns HTTP 429. */
    @Test
    void handleRateLimit_returns429() {
        RateLimitException ex = new RateLimitException("Rate limit exceeded");

        ResponseEntity<ApiErrorResponse> response = handler.handleRateLimit(ex, fakeRequest);

        assertEquals(429, response.getStatusCode().value());
        assertEquals("Rate limit exceeded", response.getBody().message());
    }

    /** Verify that an unknown exception returns HTTP 500 with the request path. */
    @Test
    void handleUnknown_returns500() {
        Exception ex = new RuntimeException("Something broke");

        ResponseEntity<ApiErrorResponse> response = handler.handleUnknown(ex, fakeRequest);

        assertEquals(500, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Unexpected server error"));
        assertEquals("/api/test", response.getBody().path());
    }

    /** Verify that the ApiErrorResponse fields are populated correctly. */
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

    /** Verify that a 404 for a match lookup says the match, not the account, wasn't found. */
    @Test
    void handleClientError_notFoundOnMatches_saysMatchNotFound() {
        fakeRequest.setRequestURI("/api/matches/full-detail");
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.NOT_FOUND, "Not Found", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(ex, fakeRequest);

        assertEquals(404, response.getStatusCode().value());
        assertTrue(response.getBody().message().startsWith("Match not found"));
    }

    /** Verify that an uncommon Riot status gets the generic failure message. */
    @Test
    void handleClientError_uncommonStatus_returnsGenericMessage() {
        HttpClientErrorException ex = HttpClientErrorException.create(
                HttpStatus.CONFLICT, "Conflict", HttpHeaders.EMPTY, null, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleClientError(ex, fakeRequest);

        assertEquals(409, response.getStatusCode().value());
        assertTrue(response.getBody().message().contains("Riot API request failed"));
    }

    /** Verify that a malformed request body is a 400, not a 500. */
    @Test
    void handleUnreadableBody_returns400() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException(
                "bad json", new ServletServerHttpRequest(fakeRequest));

        ResponseEntity<ApiErrorResponse> response = handler.handleUnreadableBody(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Request body is missing or malformed", response.getBody().message());
    }

    /** Verify that an unsupported method is a 405 that lists the allowed methods. */
    @Test
    void handleRequestError_methodNotSupported_returns405WithAllow() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("PUT", java.util.List.of("GET"));

        ResponseEntity<ApiErrorResponse> response = handler.handleRequestError(ex, fakeRequest);

        assertEquals(405, response.getStatusCode().value());
        assertEquals("Method Not Allowed", response.getBody().error());
        assertTrue(response.getHeaders().getAllow().contains(HttpMethod.GET));
    }

    /** Verify that an unknown path is a 404, not a 500. */
    @Test
    void handleRequestError_noResource_returns404() {
        NoResourceFoundException ex = new NoResourceFoundException(HttpMethod.GET, ".env");

        ResponseEntity<ApiErrorResponse> response = handler.handleRequestError(ex, fakeRequest);

        assertEquals(404, response.getStatusCode().value());
    }

    /** Verify that a missing required header is a 400, not a 500. */
    @Test
    void handleRequestError_missingHeader_returns400() throws Exception {
        MissingRequestHeaderException ex = new MissingRequestHeaderException("Stripe-Signature",
                new org.springframework.core.MethodParameter(String.class.getMethod("trim"), -1));

        ResponseEntity<ApiErrorResponse> response = handler.handleRequestError(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
    }

    /** Verify that a ResponseStatusException keeps its status and reason. */
    @Test
    void handleRequestError_responseStatus_keepsStatusAndReason() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid match ID");

        ResponseEntity<ApiErrorResponse> response = handler.handleRequestError(ex, fakeRequest);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Invalid match ID", response.getBody().message());
    }
}
