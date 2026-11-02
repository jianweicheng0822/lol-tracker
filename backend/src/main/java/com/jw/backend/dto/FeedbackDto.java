package com.jw.backend.dto;

import com.jw.backend.entity.Feedback;

import java.time.Instant;

/** One feedback entry as the admin page shows it. */
public record FeedbackDto(Long id, String type, String message, String email, String username,
                          String pageUrl, String userAgent, boolean resolved, Instant createdAt) {

    public static FeedbackDto from(Feedback f) {
        return new FeedbackDto(f.getId(), f.getType(), f.getMessage(), f.getEmail(), f.getUsername(),
                f.getPageUrl(), f.getUserAgent(), f.isResolved(), f.getCreatedAt());
    }
}
