package com.jw.backend.service;

import com.jw.backend.dto.FeedbackDto;
import com.jw.backend.dto.FeedbackRequest;
import com.jw.backend.entity.Feedback;
import com.jw.backend.exception.RateLimitException;
import com.jw.backend.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Store feedback from the site's form and list it for the admins.
 *
 * <p>Admins are the usernames in {@code admin.usernames} (comma-separated, from ADMIN_USERNAMES).
 * A site-wide daily cap, counted in the database so restarts don't reset it, keeps someone
 * rotating IPs from filling the table. New entries are also emailed out by {@link FeedbackNotifier}
 * when an address is configured.</p>
 */
@Service
public class FeedbackService {

    static final int PAGE_URL_MAX = 500;
    static final int USER_AGENT_MAX = 300;

    private final FeedbackRepository feedbackRepository;
    private final Set<String> adminUsernames;
    private final int dailyLimit;
    private final FeedbackNotifier notifier;

    public FeedbackService(FeedbackRepository feedbackRepository,
                           FeedbackNotifier notifier,
                           @Value("${admin.usernames:}") String adminUsernames,
                           @Value("${feedback.daily-limit:200}") int dailyLimit) {
        this.feedbackRepository = feedbackRepository;
        this.notifier = notifier;
        this.adminUsernames = Arrays.stream(adminUsernames.split(","))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.dailyLimit = dailyLimit;
    }

    public boolean isAdmin(String username) {
        return username != null && adminUsernames.contains(username);
    }

    /** Save a validated request. Throws RateLimitException once today's site-wide cap is reached. */
    public void submit(FeedbackRequest request, String username, String userAgent) {
        Instant startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        if (feedbackRepository.countByCreatedAtAfter(startOfDay) >= dailyLimit) {
            throw new RateLimitException("Feedback is closed for today. Please try again tomorrow.");
        }
        String email = request.email() == null || request.email().isBlank() ? null : request.email().strip();
        Feedback feedback = new Feedback(
                request.type(),
                request.message().strip(),
                email,
                username,
                truncate(request.pageUrl(), PAGE_URL_MAX),
                truncate(userAgent, USER_AGENT_MAX));
        feedbackRepository.save(feedback);
        notifier.notifyNew(feedback);
    }

    public List<FeedbackDto> latest() {
        return feedbackRepository.findTop200ByOrderByCreatedAtDesc().stream().map(FeedbackDto::from).toList();
    }

    /** Mark an entry handled or not. Empty if there's no such entry. */
    @Transactional
    public Optional<FeedbackDto> setResolved(Long id, boolean resolved) {
        return feedbackRepository.findById(id).map(f -> {
            f.setResolved(resolved);
            return FeedbackDto.from(feedbackRepository.save(f));
        });
    }

    static String truncate(String s, int max) {
        if (s == null || s.isBlank()) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
