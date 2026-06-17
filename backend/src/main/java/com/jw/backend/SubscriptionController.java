/**
 * @file SubscriptionController.java
 * @description REST controller for managing user subscription tiers.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.service.SubscriptionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

/**
 * Provide subscription tier retrieval and upgrade operations.
 *
 * <p>Tier 0 represents the free plan; tier 1 represents PRO with extended
 * match history limits and AI analysis access.</p>
 */
@RestController
@RequestMapping("/api")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    // Demo placeholder — enable via UPGRADE_ENABLED env var when payment integration is ready
    @Value("${subscription.upgrade-enabled:false}")
    private boolean upgradeEnabled;

    /**
     * Construct the controller with the subscription service dependency.
     *
     * @param subscriptionService service for managing user subscription state
     */
    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    /**
     * Retrieve the current subscription tier for the authenticated user.
     *
     * @param principal authenticated user principal; may be null for anonymous users
     * @return map containing the user's numeric tier value
     */
    @GetMapping("/tier")
    public Map<String, Integer> getTier(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        AppUser user = subscriptionService.getOrCreateUser(username);
        return Map.of("tier", user.getTier());
    }

    /**
     * Upgrade the authenticated user to PRO tier.
     *
     * <p>In the current implementation this is a simple toggle; payment integration
     * would gate this endpoint in a production deployment.</p>
     *
     * @param principal authenticated user principal; returns 401 if null
     * @return map confirming the new tier value (1 = PRO), or 401 if not authenticated
     */
    @PostMapping("/upgrade")
    public ResponseEntity<?> upgrade(Principal principal) {
        if (!upgradeEnabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Upgrade is not available at this time"));
        }
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        subscriptionService.upgrade(principal.getName());
        return ResponseEntity.ok(Map.of("tier", 1));
    }
}
