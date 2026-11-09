package com.jw.backend.metrics;

import com.jw.backend.service.FeedbackService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

/**
 * Usage metrics for the admin page. Like the feedback inbox, everyone else gets a 404.
 * Served at /usage rather than /metrics, which ad blockers block.
 */
@RestController
public class AdminMetricsController {

    private final MetricsService metricsService;
    private final FeedbackService feedbackService;

    public AdminMetricsController(MetricsService metricsService, FeedbackService feedbackService) {
        this.metricsService = metricsService;
        this.feedbackService = feedbackService;
    }

    @GetMapping("/api/admin/usage")
    public ResponseEntity<?> metrics(@RequestParam(defaultValue = "14") int days, Principal principal) {
        if (principal == null || !feedbackService.isAdmin(principal.getName())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
        }
        return ResponseEntity.ok(metricsService.lastDays(days));
    }
}
