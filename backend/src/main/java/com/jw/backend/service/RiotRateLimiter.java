package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Iterator;

/**
 * Enforces Riot's dev-key rate limits — 20 requests per second and 100 per 2 minutes — across all
 * outbound requests.
 *
 * <p>Keeps the timestamps of recent requests (a sliding window), so capacity frees up on its own as
 * time passes. There's no scheduled refill, which matters because a single busy scheduler thread
 * (e.g. a long leaderboard prefetch) used to block the refill and starve every other caller.</p>
 */
@Component
public class RiotRateLimiter {

    static final int LONG_WINDOW_LIMIT = 100;
    static final long LONG_WINDOW_MS = 120_000;
    static final int SHORT_WINDOW_LIMIT = 20;
    static final long SHORT_WINDOW_MS = 1_000;
    private static final long ACQUIRE_TIMEOUT_MS = 10_000;

    /** Clock and sleep, swappable so tests can control time. */
    interface TimeSource {
        long nowMillis();

        void sleep(long millis) throws InterruptedException;
    }

    private static final TimeSource SYSTEM_TIME = new TimeSource() {
        @Override
        public long nowMillis() {
            // Monotonic, so wall-clock adjustments can't open or close the windows
            return System.nanoTime() / 1_000_000;
        }

        @Override
        public void sleep(long millis) throws InterruptedException {
            Thread.sleep(millis);
        }
    };

    private final TimeSource time;
    // Timestamps of requests made in the last LONG_WINDOW_MS, oldest first
    private final ArrayDeque<Long> recentRequests = new ArrayDeque<>();

    public RiotRateLimiter() {
        this(SYSTEM_TIME);
    }

    RiotRateLimiter(TimeSource time) {
        this.time = time;
    }

    /**
     * Acquire a permit, waiting up to 10 seconds for capacity.
     *
     * @throws RateLimitException if no permit frees up in time
     */
    public void acquire() {
        if (!tryAcquire(0, ACQUIRE_TIMEOUT_MS)) {
            throw new RateLimitException("Riot API rate limit exhausted. Please try again shortly.");
        }
    }

    /**
     * Non-blocking acquire.
     *
     * @return true if a permit was acquired, false if the request would exceed either limit right now
     */
    public boolean tryAcquire() {
        return tryAcquire(0, 0);
    }

    /**
     * Acquire a permit only while more than {@code reservePermits} remain in the 2-minute budget,
     * waiting up to {@code maxWaitMs} for capacity. Background work passes a reserve so interactive
     * requests (player search, page views) always keep headroom.
     *
     * @return true if a permit was acquired within the wait time
     */
    public boolean tryAcquire(int reservePermits, long maxWaitMs) {
        long deadline = time.nowMillis() + maxWaitMs;
        while (true) {
            long waitMs;
            synchronized (this) {
                long now = time.nowMillis();
                expireOld(now);
                waitMs = millisUntilAvailable(now, reservePermits);
                if (waitMs == 0) {
                    recentRequests.addLast(now);
                    return true;
                }
            }
            long remaining = deadline - time.nowMillis();
            if (remaining <= 0) {
                return false;
            }
            try {
                time.sleep(Math.min(waitMs, remaining));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Rate limiter interrupted", e);
            }
        }
    }

    /**
     * Permits left in the 2-minute budget. (The per-second limit only adds brief waits, so callers
     * use this to decide how much budget background work may spend.)
     */
    public synchronized int availablePermits() {
        expireOld(time.nowMillis());
        return LONG_WINDOW_LIMIT - recentRequests.size();
    }

    private void expireOld(long now) {
        while (!recentRequests.isEmpty() && recentRequests.peekFirst() <= now - LONG_WINDOW_MS) {
            recentRequests.pollFirst();
        }
    }

    /** 0 if a request may go out now, otherwise how many ms until one can. */
    private long millisUntilAvailable(long now, int reservePermits) {
        long wait = 0;
        int size = recentRequests.size();

        // 2-minute budget: more than reservePermits must be left before this request
        int allowed = LONG_WINDOW_LIMIT - reservePermits;
        if (size >= allowed) {
            // The oldest (size - allowed + 1) requests have to age out first
            long blocking = nthOldest(size - allowed);
            wait = Math.max(wait, blocking + LONG_WINDOW_MS - now);
        }

        // Per-second burst limit
        int inLastSecond = 0;
        for (Iterator<Long> it = recentRequests.descendingIterator(); it.hasNext(); ) {
            if (it.next() > now - SHORT_WINDOW_MS) inLastSecond++;
            else break;
        }
        if (inLastSecond >= SHORT_WINDOW_LIMIT) {
            long blocking = nthOldest(size - SHORT_WINDOW_LIMIT);
            wait = Math.max(wait, blocking + SHORT_WINDOW_MS - now);
        }
        return wait;
    }

    private long nthOldest(int index) {
        Iterator<Long> it = recentRequests.iterator();
        for (int i = 0; i < index; i++) it.next();
        return it.next();
    }
}
