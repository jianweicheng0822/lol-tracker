/**
 * @file GlobalExceptionHandler.java
 * @description Centralized exception handler translating exceptions into structured API error responses.
 * @module backend.exception
 */
package com.jw.backend.exception;

import com.jw.backend.dto.ApiErrorResponse;
import com.jw.backend.util.LogSanitizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;

/**
 * Map application and upstream exceptions to consistent {@link ApiErrorResponse} payloads.
 *
 * <p>Provides user-friendly error messages for common Riot API error codes while
 * keeping internal details out of client-facing responses. Spring selects handlers
 * by exception type specificity, with the generic fallback catching unexpected errors.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handle HTTP 4xx errors from the Riot API with user-friendly messages.
     *
     * @param ex  the client error exception from RestClient
     * @param req the originating HTTP request
     * @return structured error response with contextual guidance
     */
    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<ApiErrorResponse> handleClientError(HttpClientErrorException ex, HttpServletRequest req) {
        HttpStatus status = (HttpStatus) ex.getStatusCode();

        // Riot rejecting our key is our problem, not the visitor's: report it as unavailable
        // and keep the key details in the log
        if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
            log.error("Riot API rejected the request ({}) on {}: check RIOT_API_KEY", status.value(),
                    LogSanitizer.clean(req.getRequestURI()));
            return ResponseEntity.status(503).body(new ApiErrorResponse(
                    Instant.now(), 503, "Service Unavailable",
                    "Riot data is unavailable right now. Please try again later.", req.getRequestURI()));
        }

        String msg = switch (status) {
            case NOT_FOUND -> req.getRequestURI().startsWith("/api/matches")
                    ? "Match not found. Check the match ID and region."
                    : "Riot account not found. Check gameName/tagLine (case/spacing) and region.";
            case TOO_MANY_REQUESTS -> "Rate limited (429). Please wait a bit and try again.";
            default -> "Riot API request failed: " + status;
        };

        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                msg,
                req.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }

    /**
     * Handle HTTP 5xx errors from the Riot API.
     *
     * @param ex  the server error exception from RestClient
     * @param req the originating HTTP request
     * @return structured error response advising retry
     */
    @ExceptionHandler(HttpServerErrorException.class)
    public ResponseEntity<ApiErrorResponse> handleServerError(HttpServerErrorException ex, HttpServletRequest req) {
        HttpStatus status = (HttpStatus) ex.getStatusCode();
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                "Riot API server error. Please try again later.",
                req.getRequestURI()
        );
        return ResponseEntity.status(status).body(body);
    }

    /**
     * Handle missing required request parameters.
     *
     * @param ex  the missing parameter exception
     * @param req the originating HTTP request
     * @return 400 response identifying the missing parameter
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParam(
            MissingServletRequestParameterException ex, HttpServletRequest req) {
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                400,
                "Bad Request",
                "Missing required parameter: " + ex.getParameterName(),
                req.getRequestURI()
        );
        return ResponseEntity.status(400).body(body);
    }

    /**
     * Handle type conversion failures for request parameters.
     *
     * @param ex  the type mismatch exception
     * @param req the originating HTTP request
     * @return 400 response identifying the invalid parameter
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                400,
                "Bad Request",
                "Invalid value for parameter: " + ex.getName(),
                req.getRequestURI()
        );
        return ResponseEntity.status(400).body(body);
    }

    /**
     * Handle a request body that is missing or isn't JSON of the expected shape.
     *
     * @param ex  the body parsing exception
     * @param req the originating HTTP request
     * @return 400 response
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableBody(
            HttpMessageNotReadableException ex, HttpServletRequest req) {
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                400,
                "Bad Request",
                "Request body is missing or malformed",
                req.getRequestURI()
        );
        return ResponseEntity.status(400).body(body);
    }

    /**
     * Handle request errors that already carry their HTTP status: a missing header (400), an
     * unsupported method (405) or content type (415), an unknown path (404), or a
     * {@link ResponseStatusException} thrown by a controller.
     *
     * @param ex  the exception, which implements {@link ErrorResponse}
     * @param req the originating HTTP request
     * @return response with the exception's status, headers (e.g. Allow) and detail message
     */
    @ExceptionHandler({ServletRequestBindingException.class, HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class, NoResourceFoundException.class, ResponseStatusException.class})
    public ResponseEntity<ApiErrorResponse> handleRequestError(Exception ex, HttpServletRequest req) {
        ErrorResponse error = (ErrorResponse) ex;
        HttpStatusCode status = error.getStatusCode();
        HttpStatus known = HttpStatus.resolve(status.value());
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                status.value(),
                known != null ? known.getReasonPhrase() : "Error",
                error.getBody().getDetail(),
                req.getRequestURI()
        );
        return ResponseEntity.status(status).headers(error.getHeaders()).body(body);
    }

    /**
     * Handle application-level rate limit violations.
     *
     * @param ex  the rate limit exception with a user-facing message
     * @param req the originating HTTP request
     * @return 429 response with rate limit guidance
     */
    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ApiErrorResponse> handleRateLimit(RateLimitException ex, HttpServletRequest req) {
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                429,
                "Too Many Requests",
                ex.getMessage(),
                req.getRequestURI()
        );
        return ResponseEntity.status(429).body(body);
    }

    /**
     * Catch-all handler for unexpected exceptions.
     *
     * <p>Logs should be checked for root cause; the client receives a generic message.</p>
     *
     * @param ex  the unhandled exception
     * @param req the originating HTTP request
     * @return 500 response with generic error message
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnknown(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception on {} {}", req.getMethod(), LogSanitizer.clean(req.getRequestURI()), ex);
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(),
                500,
                "Internal Server Error",
                "Unexpected server error. Check backend logs.",
                req.getRequestURI()
        );
        return ResponseEntity.status(500).body(body);
    }
}
