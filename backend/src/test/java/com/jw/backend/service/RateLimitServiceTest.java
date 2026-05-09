package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitServiceTest {

    private RateLimitService rateLimitService;

    @BeforeEach
    void setUp() {
        rateLimitService = new RateLimitService();
    }

    @Test
    void checkRateLimit_proUser_neverThrows() {
        for (int i = 0; i < 20; i++) {
            assertDoesNotThrow(() -> rateLimitService.checkRateLimit("user1", 1));
        }
    }

    @Test
    void checkRateLimit_freeUser_allowsUpToFiveRequests() {
        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> rateLimitService.checkRateLimit("user1", 0));
        }
    }

    @Test
    void checkRateLimit_freeUser_throwsOnSixthRequest() {
        for (int i = 0; i < 5; i++) {
            rateLimitService.checkRateLimit("user1", 0);
        }

        assertThrows(RateLimitException.class, () -> rateLimitService.checkRateLimit("user1", 0));
    }

    @Test
    void checkRateLimit_differentUsers_trackedIndependently() {
        for (int i = 0; i < 5; i++) {
            rateLimitService.checkRateLimit("user1", 0);
        }

        // Different user should still be allowed
        assertDoesNotThrow(() -> rateLimitService.checkRateLimit("user2", 0));
    }
}
