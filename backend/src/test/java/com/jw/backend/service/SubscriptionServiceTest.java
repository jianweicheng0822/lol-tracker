/**
 * @file SubscriptionServiceTest.java
 * @description Unit tests for the subscription service tier management and access control.
 * @module backend.test
 */
package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Validate the {@link SubscriptionService} for user retrieval/creation, tier changes from
 * Stripe subscription status, match count limits, and AI access gating based on subscription tier.
 */
@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    private SubscriptionService subscriptionService;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService(appUserRepository);
    }

    /** Verify that an existing user is returned without creating a new one. */
    @Test
    void getOrCreateUser_whenExists_returnsExisting() {
        AppUser existing = new AppUser();
        existing.setUsername("testuser");
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(existing));

        AppUser result = subscriptionService.getOrCreateUser("testuser");

        assertSame(existing, result);
        verify(appUserRepository, never()).save(any());
    }

    /** Verify that a new user is created and saved when not found. */
    @Test
    void getOrCreateUser_whenNotExists_createsNew() {
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.empty());
        when(appUserRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppUser result = subscriptionService.getOrCreateUser("testuser");

        assertNotNull(result);
        assertEquals(0, result.getTier());
        verify(appUserRepository).save(any());
    }

    /** Verify that a null username returns an anonymous free-tier user. */
    @Test
    void getOrCreateUser_whenNull_returnsAnonymousUser() {
        AppUser result = subscriptionService.getOrCreateUser(null);

        assertNotNull(result);
        assertEquals(0, result.getTier());
        verify(appUserRepository, never()).findByUsername(any());
        verify(appUserRepository, never()).save(any());
    }

    /** Verify that statuses where the subscription is still live keep (or grant) PRO. */
    @ParameterizedTest
    @ValueSource(strings = {"active", "trialing", "past_due"})
    void updateSubscriptionStatus_liveStatus_setsPro(String status) {
        AppUser user = new AppUser();
        when(appUserRepository.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(user));

        subscriptionService.updateSubscriptionStatus("sub_1", status);

        assertEquals(1, user.getTier());
        assertEquals(status, user.getSubscriptionStatus());
        verify(appUserRepository).save(user);
    }

    /** Verify that a PRO user whose subscription ends up unpaid or canceled drops to FREE. */
    @ParameterizedTest
    @ValueSource(strings = {"unpaid", "canceled", "incomplete", "incomplete_expired", "paused"})
    void updateSubscriptionStatus_endedStatus_downgradesToFree(String status) {
        AppUser user = new AppUser();
        user.setTier(1);
        when(appUserRepository.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(user));

        subscriptionService.updateSubscriptionStatus("sub_1", status);

        assertEquals(0, user.getTier());
        assertEquals(status, user.getSubscriptionStatus());
        verify(appUserRepository).save(user);
    }

    /** Verify that an unknown subscription ID is ignored. */
    @Test
    void updateSubscriptionStatus_unknownSubscription_doesNothing() {
        when(appUserRepository.findByStripeSubscriptionId("sub_missing")).thenReturn(Optional.empty());

        subscriptionService.updateSubscriptionStatus("sub_missing", "active");

        verify(appUserRepository, never()).save(any());
    }

    /** Verify that a free-tier user gets a max match count of 20. */
    @Test
    void getMaxMatchCount_freeUser_returns20() {
        AppUser freeUser = new AppUser();
        freeUser.setUsername("testuser");
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(freeUser));

        assertEquals(20, subscriptionService.getMaxMatchCount("testuser"));
    }

    /** Verify that a PRO-tier user gets a max match count of 100. */
    @Test
    void getMaxMatchCount_proUser_returns100() {
        AppUser proUser = new AppUser();
        proUser.setUsername("testuser");
        proUser.setTier(1);
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(proUser));

        assertEquals(100, subscriptionService.getMaxMatchCount("testuser"));
    }

    /** Verify that a free-tier user does not have AI access. */
    @Test
    void hasAiAccess_freeUser_returnsFalse() {
        AppUser freeUser = new AppUser();
        freeUser.setUsername("testuser");
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(freeUser));

        assertFalse(subscriptionService.hasAiAccess("testuser"));
    }

    /** Verify that a PRO-tier user has AI access. */
    @Test
    void hasAiAccess_proUser_returnsTrue() {
        AppUser proUser = new AppUser();
        proUser.setUsername("testuser");
        proUser.setTier(1);
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(proUser));

        assertTrue(subscriptionService.hasAiAccess("testuser"));
    }
}
