/**
 * @file RateLimitServiceTest.java
 * @description Unit tests for the rate limiting service per-user request throttling.
 * @module backend.test
 */
package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Validate the {@link RateLimitService} for enforcing per-user request limits,
 * bypassing limits for PRO users, and tracking users independently.
 */
class RateLimitServiceTest {

    private RateLimitService rateLimitService;

    @BeforeEach
    void setUp() {
        rateLimitService = new RateLimitService();
    }

    /** Verify that PRO-tier users are never rate limited. */
    @Test
    void checkRateLimit_proUser_neverThrows() {
        for (int i = 0; i < 20; i++) {
            assertDoesNotThrow(() -> rateLimitService.checkRateLimit("user1", 1));
        }
    }

    /** Verify that free-tier users are allowed up to five requests. */
    @Test
    void checkRateLimit_freeUser_allowsUpToFiveRequests() {
        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> rateLimitService.checkRateLimit("user1", 0));
        }
    }

    /** Verify that the sixth request from a free-tier user throws RateLimitException. */
    @Test
    void checkRateLimit_freeUser_throwsOnSixthRequest() {
        for (int i = 0; i < 5; i++) {
            rateLimitService.checkRateLimit("user1", 0);
        }

        assertThrows(RateLimitException.class, () -> rateLimitService.checkRateLimit("user1", 0));
    }

    /** Verify that rate limits are tracked independently per user. */
    @Test
    void checkRateLimit_differentUsers_trackedIndependently() {
        for (int i = 0; i < 5; i++) {
            rateLimitService.checkRateLimit("user1", 0);
        }

        // Different user should still be allowed
        assertDoesNotThrow(() -> rateLimitService.checkRateLimit("user2", 0));
    }
}
