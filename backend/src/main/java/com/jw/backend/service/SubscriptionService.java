/**
 * @file SubscriptionService.java
 * @description Service for managing user subscription tiers and feature access.
 * @module backend.service
 */
package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import org.springframework.stereotype.Service;

/**
 * Manage subscription tier state and enforce tier-based feature gating.
 *
 * <p>Tier 0 represents the free plan with limited match history and no AI access.
 * Tier 1 represents PRO with extended limits and full feature access.</p>
 */
@Service
public class SubscriptionService {

    private final AppUserRepository appUserRepository;

    /**
     * Construct the service with the user repository.
     *
     * @param appUserRepository JPA repository for user persistence
     */
    public SubscriptionService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    /**
     * Retrieve an existing user or create a transient/persisted instance.
     *
     * <p>Anonymous users (null username) receive a transient free-tier AppUser
     * that is not persisted, preventing database bloat from unauthenticated traffic.</p>
     *
     * @param username the authenticated username, or null for anonymous users
     * @return the existing or newly created AppUser instance
     */
    public AppUser getOrCreateUser(String username) {
        if (username == null) {
            return new AppUser();
        }
        return appUserRepository.findByUsername(username)
                .orElseGet(() -> {
                    AppUser user = new AppUser();
                    user.setUsername(username);
                    return appUserRepository.save(user);
                });
    }

    /**
     * Upgrade a user to PRO tier (tier 1).
     *
     * @param username the authenticated username
     */
    public void upgrade(String username) {
        AppUser user = getOrCreateUser(username);
        user.setTier(1);
        appUserRepository.save(user);
    }

    /**
     * Determine the maximum number of matches a user can fetch per request.
     *
     * @param username the authenticated username, or null for anonymous users
     * @return 100 for PRO users, 20 for free-tier users
     */
    public int getMaxMatchCount(String username) {
        AppUser user = getOrCreateUser(username);
        return user.getTier() == 1 ? 100 : 20;
    }

    /**
     * Check whether a user has access to AI analysis features.
     *
     * @param username the authenticated username, or null for anonymous users
     * @return true if the user is on the PRO tier
     */
    public boolean hasAiAccess(String username) {
        AppUser user = getOrCreateUser(username);
        return user.getTier() == 1;
    }
}
