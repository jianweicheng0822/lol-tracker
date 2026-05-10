/**
 * @file RateLimitService.java
 * @description Service implementing sliding-window rate limiting for API requests.
 * @module backend.service
 */
package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
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

    private final ConcurrentHashMap<String, List<Long>> requestLog = new ConcurrentHashMap<>();

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
}
