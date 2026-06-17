/**
 * @file RateLimitService.java
 * @description Service implementing sliding-window rate limiting for API requests.
 * @module backend.service
 */
package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Enforce per-user rate limits using an in-memory sliding time window.
 *
 * <p>Free-tier users are limited to a fixed number of requests per minute.
 * PRO-tier users bypass rate limiting entirely. The in-memory approach is
 * suitable for single-instance deployments; a distributed cache (e.g., Redis)
 * would be needed for horizontal scaling.</p>
 */
@Service
public class RateLimitService {

    private static final int FREE_MAX_REQUESTS = 5;
    private static final long WINDOW_MS = 60_000;

    private static final int AI_MAX_REQUESTS = 20;
    private static final long AI_WINDOW_MS = 3_600_000;

    private final ConcurrentHashMap<String, List<Long>> requestLog = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<Long>> aiRequestLog = new ConcurrentHashMap<>();

    /**
     * Verify the user has not exceeded their rate limit within the current window.
     *
     * <p>PRO-tier users (tier == 1) are exempt from rate limiting. For free-tier
     * users, expired timestamps are purged before checking the count against the limit.</p>
     *
     * @param userIdentifier unique key for the user (username or "anon-{puuid}")
     * @param tier           the user's subscription tier (0 = free, 1 = PRO)
     * @throws RateLimitException if the free-tier user exceeds the allowed request count
     */
    public void checkRateLimit(String userIdentifier, int tier) {
        if (tier == 1) return;

        long now = System.currentTimeMillis();
        long windowStart = now - WINDOW_MS;

        List<Long> timestamps = requestLog.computeIfAbsent(userIdentifier, k -> new CopyOnWriteArrayList<>());

        timestamps.removeIf(t -> t < windowStart);

        if (timestamps.size() >= FREE_MAX_REQUESTS) {
            throw new RateLimitException("Rate limit exceeded. FREE users are limited to " + FREE_MAX_REQUESTS + " requests per minute.");
        }

        timestamps.add(now);
    }

    /**
     * Verify the user has not exceeded the AI endpoint rate limit (20 requests per hour).
     *
     * @param userIdentifier unique key for the user (username)
     * @throws RateLimitException if the user exceeds the allowed AI request count
     */
    public void checkAiRateLimit(String userIdentifier) {
        long now = System.currentTimeMillis();
        long windowStart = now - AI_WINDOW_MS;

        List<Long> timestamps = aiRequestLog.computeIfAbsent(userIdentifier, k -> new CopyOnWriteArrayList<>());

        timestamps.removeIf(t -> t < windowStart);

        if (timestamps.size() >= AI_MAX_REQUESTS) {
            throw new RateLimitException("AI rate limit exceeded. Limited to " + AI_MAX_REQUESTS + " requests per hour.");
        }

        timestamps.add(now);
    }

    public void reset() {
        requestLog.clear();
        aiRequestLog.clear();
    }

    @Scheduled(fixedRate = 60000)
    void evictStaleEntries() {
        long now = System.currentTimeMillis();
        evictFrom(requestLog, now - WINDOW_MS);
        evictFrom(aiRequestLog, now - AI_WINDOW_MS);
    }

    private void evictFrom(ConcurrentHashMap<String, List<Long>> log, long cutoff) {
        log.forEach((key, timestamps) -> {
            timestamps.removeIf(t -> t < cutoff);
            if (timestamps.isEmpty()) {
                log.remove(key);
            }
        });
    }
}
