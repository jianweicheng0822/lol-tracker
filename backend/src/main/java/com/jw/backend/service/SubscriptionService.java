package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class SubscriptionService {

    private final AppUserRepository appUserRepository;

    public SubscriptionService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

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

    public void upgrade(String username) {
        AppUser user = getOrCreateUser(username);
        user.setTier(1);
        appUserRepository.save(user);
    }

    public int getMaxMatchCount(String username) {
        AppUser user = getOrCreateUser(username);
        return user.getTier() == 1 ? 100 : 20;
    }

    public boolean hasAiAccess(String username) {
        AppUser user = getOrCreateUser(username);
        return user.getTier() == 1;
    }

    /** Activate a PRO subscription after successful Stripe checkout. */
    public void activateSubscription(String stripeCustomerId, String subscriptionId) {
        Optional<AppUser> opt = appUserRepository.findByStripeCustomerId(stripeCustomerId);
        if (opt.isEmpty()) return;
        AppUser user = opt.get();
        user.setTier(1);
        user.setStripeSubscriptionId(subscriptionId);
        user.setSubscriptionStatus("active");
        appUserRepository.save(user);
    }

    /** Update subscription status (e.g., past_due, active). */
    public void updateSubscriptionStatus(String subscriptionId, String status) {
        Optional<AppUser> opt = appUserRepository.findByStripeSubscriptionId(subscriptionId);
        if (opt.isEmpty()) return;
        AppUser user = opt.get();
        user.setSubscriptionStatus(status);
        if ("active".equals(status)) {
            user.setTier(1);
        }
        appUserRepository.save(user);
    }

    /** Cancel subscription: downgrade to FREE. */
    public void cancelSubscription(String subscriptionId) {
        Optional<AppUser> opt = appUserRepository.findByStripeSubscriptionId(subscriptionId);
        if (opt.isEmpty()) return;
        AppUser user = opt.get();
        user.setTier(0);
        user.setStripeSubscriptionId(null);
        user.setSubscriptionStatus("none");
        appUserRepository.save(user);
    }

    /** Link a Stripe customer ID to a user before checkout. */
    public void setStripeCustomerId(String username, String stripeCustomerId) {
        AppUser user = getOrCreateUser(username);
        user.setStripeCustomerId(stripeCustomerId);
        appUserRepository.save(user);
    }
}
