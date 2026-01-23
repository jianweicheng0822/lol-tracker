package com.jw.backend.exception;

import com.jw.backend.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<ApiErrorResponse> handleClientError(HttpClientErrorException ex, HttpServletRequest req) {
        HttpStatus status = (HttpStatus) ex.getStatusCode();

        // Make messages readable for frontend users
        String msg = switch (status) {
            case NOT_FOUND -> "Riot account not found. Check gameName/tagLine (case/spacing) and region.";
            case UNAUTHORIZED, FORBIDDEN -> "Riot API key is invalid or expired. Update your RIOT_API_KEY.";
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

    // =====================================================
    // Handle missing request parameters (e.g., ?gameName is missing)
    // Returns 400 Bad Request
    // =====================================================
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

    // =====================================================
    // Handle invalid parameter types (e.g., region=INVALID)
    // Returns 400 Bad Request
    // =====================================================
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

    // =====================================================
    // Catch-all for any other unexpected exceptions
    // Returns 500 Internal Server Error
    // This should be LAST so specific handlers run first
    // =====================================================
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnknown(Exception ex, HttpServletRequest req) {
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
