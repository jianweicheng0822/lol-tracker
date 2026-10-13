package com.jw.backend.service;

/** Manual clock for RiotRateLimiter tests: time only moves when a test advances it or the limiter sleeps. */
class FakeRateLimiterTime implements RiotRateLimiter.TimeSource {

    private long now = 1_000_000;
    private long totalSlept;

    @Override
    public synchronized long nowMillis() {
        return now;
    }

    @Override
    public synchronized void sleep(long millis) {
        now += millis;
        totalSlept += millis;
    }

    synchronized void advance(long millis) {
        now += millis;
    }

    synchronized long totalSlept() {
        return totalSlept;
    }
}
