package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitServiceTest {

    private RateLimitService rateLimitService;
    private MockHttpSession session;

    @BeforeEach
    void setUp() {
        rateLimitService = new RateLimitService();
        session = new MockHttpSession();
    }

    @Test
    void checkRateLimit_proUser_neverThrows() {
        for (int i = 0; i < 20; i++) {
            assertDoesNotThrow(() -> rateLimitService.checkRateLimit(session, 1));
        }
    }

    @Test
    void checkRateLimit_freeUser_allowsUpToFiveRequests() {
        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> rateLimitService.checkRateLimit(session, 0));
        }
    }

    @Test
    void checkRateLimit_freeUser_throwsOnSixthRequest() {
        for (int i = 0; i < 5; i++) {
            rateLimitService.checkRateLimit(session, 0);
        }

        assertThrows(RateLimitException.class, () -> rateLimitService.checkRateLimit(session, 0));
    }

    @Test
    void checkRateLimit_differentSessions_trackedIndependently() {
        MockHttpSession session2 = new MockHttpSession();

        for (int i = 0; i < 5; i++) {
            rateLimitService.checkRateLimit(session, 0);
        }

        // Different session should still be allowed
        assertDoesNotThrow(() -> rateLimitService.checkRateLimit(session2, 0));
    }
}
