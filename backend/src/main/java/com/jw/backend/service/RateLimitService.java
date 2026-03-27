package com.jw.backend.service;

import com.jw.backend.exception.RateLimitException;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class RateLimitService {

    private static final int FREE_MAX_REQUESTS = 5;
    private static final long WINDOW_MS = 60_000;

    private final ConcurrentHashMap<String, List<Long>> requestLog = new ConcurrentHashMap<>();

    public void checkRateLimit(HttpSession session, int tier) {
        if (tier == 1) return; // PRO: unlimited

        String sessionId = session.getId();
        long now = System.currentTimeMillis();
        long windowStart = now - WINDOW_MS;

        List<Long> timestamps = requestLog.computeIfAbsent(sessionId, k -> new CopyOnWriteArrayList<>());

        // Prune expired timestamps
        timestamps.removeIf(t -> t < windowStart);

        if (timestamps.size() >= FREE_MAX_REQUESTS) {
            throw new RateLimitException("Rate limit exceeded. FREE users are limited to " + FREE_MAX_REQUESTS + " requests per minute.");
        }

        timestamps.add(now);
    }
}
