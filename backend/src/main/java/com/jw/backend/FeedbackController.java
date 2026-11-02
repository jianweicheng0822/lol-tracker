package com.jw.backend;

import com.jw.backend.dto.FeedbackRequest;
import com.jw.backend.service.FeedbackService;
import com.jw.backend.service.RateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

/**
 * Feedback form submissions (anyone) and the admin view of them.
 *
 * <p>Admin endpoints answer 404 to everyone who isn't an admin, logged in or not, so they don't
 * reveal that an admin area exists.</p>
 */
@RestController
public class FeedbackController {

    private static final Map<String, String> THANKS = Map.of("message", "Thanks for the feedback!");

    private final FeedbackService feedbackService;
    private final RateLimitService rateLimitService;

    public FeedbackController(FeedbackService feedbackService, RateLimitService rateLimitService) {
        this.feedbackService = feedbackService;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping("/api/feedback")
    public ResponseEntity<?> submit(@RequestBody FeedbackRequest request, Principal principal,
                                    HttpServletRequest httpRequest) {
        // Bots get the same answer as people, so nothing tells them to try a different way
        if (request.isBot()) {
            return ResponseEntity.ok(THANKS);
        }
        String error = request.validationError();
        if (error != null) {
            return ResponseEntity.badRequest().body(Map.of("error", error));
        }
        rateLimitService.checkFeedbackRateLimit(httpRequest.getRemoteAddr());
        String username = principal != null ? principal.getName() : null;
        feedbackService.submit(request, username, httpRequest.getHeader(HttpHeaders.USER_AGENT));
        return ResponseEntity.ok(THANKS);
    }

    /** Whether the caller is an admin, so the header knows to show the Feedback link. */
    @GetMapping("/api/admin/status")
    public Map<String, Boolean> status(Principal principal) {
        return Map.of("admin", principal != null && feedbackService.isAdmin(principal.getName()));
    }

    @GetMapping("/api/admin/feedback")
    public ResponseEntity<?> list(Principal principal) {
        ResponseEntity<?> denied = denyUnlessAdmin(principal);
        if (denied != null) return denied;
        return ResponseEntity.ok(feedbackService.latest());
    }

    @PutMapping("/api/admin/feedback/{id}")
    public ResponseEntity<?> setResolved(@PathVariable Long id, @RequestBody Map<String, Boolean> body,
                                         Principal principal) {
        ResponseEntity<?> denied = denyUnlessAdmin(principal);
        if (denied != null) return denied;
        Boolean resolved = body.get("resolved");
        if (resolved == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing field: resolved"));
        }
        return feedbackService.setResolved(id, resolved)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found")));
    }

    private ResponseEntity<?> denyUnlessAdmin(Principal principal) {
        if (principal == null || !feedbackService.isAdmin(principal.getName())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found"));
        }
        return null;
    }
}
