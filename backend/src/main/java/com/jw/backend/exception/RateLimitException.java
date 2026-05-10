/**
 * @file RateLimitException.java
 * @description Custom exception thrown when a user exceeds their API rate limit.
 * @module backend.exception
 */
package com.jw.backend.exception;

/**
 * Signal that a user has exceeded their per-minute request quota.
 *
 * <p>Caught by {@link GlobalExceptionHandler} and mapped to a 429 HTTP response.</p>
 */
public class RateLimitException extends RuntimeException {

    /**
     * Construct a rate limit exception with a user-facing message.
     *
     * @param message description of the rate limit violation
     */
    public RateLimitException(String message) {
        super(message);
    }
}
