/**
 * @file SubscriptionController.java
 * @description REST controller for managing user subscription tiers.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.service.SubscriptionService;
import org.springframework.web.bind.annotation.GetMapping;
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
     * @param principal authenticated user principal; may be null for anonymous users
     * @return map confirming the new tier value (1 = PRO)
     */
    @GetMapping("/upgrade")
    public Map<String, Integer> upgrade(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        subscriptionService.upgrade(username);
        return Map.of("tier", 1);
    }
}
