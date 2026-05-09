package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    private SubscriptionService subscriptionService;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService(appUserRepository);
    }

    @Test
    void getOrCreateUser_whenExists_returnsExisting() {
        AppUser existing = new AppUser();
        existing.setUsername("testuser");
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(existing));

        AppUser result = subscriptionService.getOrCreateUser("testuser");

        assertSame(existing, result);
        verify(appUserRepository, never()).save(any());
    }

    @Test
    void getOrCreateUser_whenNotExists_createsNew() {
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.empty());
        when(appUserRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppUser result = subscriptionService.getOrCreateUser("testuser");

        assertNotNull(result);
        assertEquals(0, result.getTier());
        verify(appUserRepository).save(any());
    }

    @Test
    void getOrCreateUser_whenNull_returnsAnonymousUser() {
        AppUser result = subscriptionService.getOrCreateUser(null);

        assertNotNull(result);
        assertEquals(0, result.getTier());
        verify(appUserRepository, never()).findByUsername(any());
        verify(appUserRepository, never()).save(any());
    }

    @Test
    void upgrade_setsTierToOne() {
        AppUser user = new AppUser();
        user.setUsername("testuser");
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        subscriptionService.upgrade("testuser");

        assertEquals(1, user.getTier());
        verify(appUserRepository).save(user);
    }

    @Test
    void getMaxMatchCount_freeUser_returns20() {
        AppUser freeUser = new AppUser();
        freeUser.setUsername("testuser");
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(freeUser));

        assertEquals(20, subscriptionService.getMaxMatchCount("testuser"));
    }

    @Test
    void getMaxMatchCount_proUser_returns100() {
        AppUser proUser = new AppUser();
        proUser.setUsername("testuser");
        proUser.setTier(1);
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(proUser));

        assertEquals(100, subscriptionService.getMaxMatchCount("testuser"));
    }

    @Test
    void hasAiAccess_freeUser_returnsFalse() {
        AppUser freeUser = new AppUser();
        freeUser.setUsername("testuser");
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(freeUser));

        assertFalse(subscriptionService.hasAiAccess("testuser"));
    }

    @Test
    void hasAiAccess_proUser_returnsTrue() {
        AppUser proUser = new AppUser();
        proUser.setUsername("testuser");
        proUser.setTier(1);
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(proUser));

        assertTrue(subscriptionService.hasAiAccess("testuser"));
    }
}
