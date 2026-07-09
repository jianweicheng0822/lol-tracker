package com.jw.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Semaphore-based token bucket that enforces Riot API rate limits (100 req / 2 min)
 * across all outbound requests. Permits are consumed before each HTTP call and
 * refilled on a fixed schedule (~1 permit per 1.2 seconds).
 */
@Component
public class RiotRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RiotRateLimiter.class);
    private static final int MAX_PERMITS = 100;
    private static final long ACQUIRE_TIMEOUT_SECONDS = 10;

    private final Semaphore semaphore = new Semaphore(MAX_PERMITS, true);

    /**
     * Acquire a permit with a timeout. Waits up to 10 seconds for a permit
     * to become available; throws if none is available within the deadline.
     */
    public void acquire() {
        try {
            boolean acquired = semaphore.tryAcquire(ACQUIRE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!acquired) {
                throw new RuntimeException("Riot API rate limit exhausted. Please try again shortly.");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Rate limiter interrupted", e);
        }
    }

    /**
     * Non-blocking acquire — used by user-initiated requests so they fail fast
     * rather than queue behind background work.
     *
     * @return true if a permit was acquired, false if none available
     */
    public boolean tryAcquire() {
        return semaphore.tryAcquire();
    }

    /**
     * Refill one permit every 1200ms (~50 per minute, staying within Riot's 100/2min limit).
     * Never exceeds MAX_PERMITS.
     */
    @Scheduled(fixedRate = 1200)
    public void refill() {
        if (semaphore.availablePermits() < MAX_PERMITS) {
            semaphore.release();
        }
    }
}
