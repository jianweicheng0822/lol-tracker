package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.*;

class RiotRateLimiterTest {

    private FakeRateLimiterTime time;
    private RiotRateLimiter limiter;

    @BeforeEach
    void setUp() {
        time = new FakeRateLimiterTime();
        limiter = new RiotRateLimiter(time);
    }

    /** Spend n permits at the max allowed pace (20 per second), advancing the fake clock as needed. */
    private void spend(int n) {
        for (int i = 0; i < n; i++) {
            assertTrue(limiter.tryAcquire(0, 2_000));
        }
    }

    @Test
    void startsWithFullTwoMinuteBudget() {
        assertEquals(100, limiter.availablePermits());
        assertTrue(limiter.tryAcquire());
        assertEquals(99, limiter.availablePermits());
    }

    @Test
    void allowsTwentyRequestsPerSecond() {
        for (int i = 0; i < 20; i++) {
            assertTrue(limiter.tryAcquire());
        }
        assertFalse(limiter.tryAcquire(), "21st request in the same second must be refused");

        time.advance(1_000);
        assertTrue(limiter.tryAcquire(), "a new second frees the burst limit");
    }

    @Test
    void allowsOneHundredRequestsPerTwoMinutes() {
        spend(100);
        assertEquals(0, limiter.availablePermits());

        time.advance(5_000); // well past the per-second window
        assertFalse(limiter.tryAcquire(), "101st request inside 2 minutes must be refused");
    }

    @Test
    void capacityFreesUpOnItsOwnAsTimePasses() {
        spend(100);
        assertEquals(0, limiter.availablePermits());

        // No refill call needed: once the window slides past the old requests, they stop counting
        time.advance(RiotRateLimiter.LONG_WINDOW_MS);
        assertEquals(100, limiter.availablePermits());
        assertTrue(limiter.tryAcquire());
    }

    @Test
    void tryAcquireWithWait_waitsOutTheBurstLimit() {
        for (int i = 0; i < 20; i++) {
            assertTrue(limiter.tryAcquire());
        }

        assertTrue(limiter.tryAcquire(0, 2_000));
        assertEquals(1_000, time.totalSlept(), "should sleep exactly until the oldest request leaves the 1s window");
    }

    @Test
    void tryAcquireWithWait_givesUpAfterMaxWait() {
        spend(100);
        long sleptBefore = time.totalSlept();

        assertFalse(limiter.tryAcquire(0, 5_000));
        assertEquals(5_000, time.totalSlept() - sleptBefore);
    }

    @Test
    void reserve_isLeftForOtherCallers() {
        spend(50);
        assertEquals(50, limiter.availablePermits());

        assertFalse(limiter.tryAcquire(50, 0), "must not dip into the reserve");
        assertTrue(limiter.tryAcquire(49, 0));
        assertEquals(49, limiter.availablePermits());
        // Callers without a reserve can still use what's left
        assertTrue(limiter.tryAcquire(0, 0));
    }

    @Test
    void reserve_waitsForBudgetToFreeUp() {
        spend(60); // 40 left, reserve 50 -> the oldest requests must age out first

        assertTrue(limiter.tryAcquire(50, RiotRateLimiter.LONG_WINDOW_MS));
        // The first second's 20 requests expire together (60 -> 40 in use), then this one is added
        assertEquals(59, limiter.availablePermits());
    }

    @Test
    void acquire_succeedsAfterShortWait() {
        for (int i = 0; i < 20; i++) {
            assertTrue(limiter.tryAcquire());
        }
        assertDoesNotThrow(limiter::acquire);
        assertEquals(1_000, time.totalSlept());
    }

    @Test
    void acquire_throwsAfterTenSecondsWhenBudgetIsSpent() {
        spend(100);
        long sleptBefore = time.totalSlept();

        assertThrows(RateLimitException.class, limiter::acquire);
        assertEquals(10_000, time.totalSlept() - sleptBefore);
    }

    @Test
    void concurrentCallers_neverExceedTheBurstLimit() throws Exception {
        // Time is frozen (only sleeps move it), so exactly 20 of these may succeed
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Boolean>> calls = new ArrayList<>();
            for (int i = 0; i < 100; i++) calls.add(limiter::tryAcquire);
            int granted = 0;
            for (Future<Boolean> f : pool.invokeAll(calls)) {
                if (f.get()) granted++;
            }
            assertEquals(20, granted);
        } finally {
            pool.shutdownNow();
        }
    }
}
