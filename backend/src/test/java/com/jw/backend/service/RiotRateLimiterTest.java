package com.jw.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RiotRateLimiterTest {

    private RiotRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new RiotRateLimiter();
    }

    @Test
    void acquire_consumesPermit() {
        limiter.acquire();
        // Should not throw — permits are available (starts with 100)
        assertTrue(limiter.tryAcquire());
    }

    @Test
    void tryAcquire_returnsTrueWhenPermitsAvailable() {
        assertTrue(limiter.tryAcquire());
    }

    @Test
    void tryAcquire_returnsFalseWhenExhausted() {
        // Exhaust all 100 permits
        for (int i = 0; i < 100; i++) {
            assertTrue(limiter.tryAcquire());
        }
        assertFalse(limiter.tryAcquire());
    }

    @Test
    void refill_addsPermitWhenBelowMax() {
        // Exhaust all permits
        for (int i = 0; i < 100; i++) {
            limiter.tryAcquire();
        }
        assertFalse(limiter.tryAcquire());

        // Refill one
        limiter.refill();
        assertTrue(limiter.tryAcquire());
    }

    @Test
    void refill_doesNotExceedMaxPermits() {
        // At full capacity, refill should be a no-op
        limiter.refill();
        limiter.refill();
        // Still should have exactly 100 permits, not more
        int count = 0;
        while (limiter.tryAcquire()) {
            count++;
        }
        assertEquals(100, count);
    }
}
