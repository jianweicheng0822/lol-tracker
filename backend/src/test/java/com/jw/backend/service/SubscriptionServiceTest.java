package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    private SubscriptionService subscriptionService;
    private MockHttpSession session;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService(appUserRepository);
        session = new MockHttpSession();
    }

    @Test
    void getOrCreateUser_whenExists_returnsExisting() {
        AppUser existing = new AppUser(session.getId());
        when(appUserRepository.findBySessionId(session.getId())).thenReturn(Optional.of(existing));

        AppUser result = subscriptionService.getOrCreateUser(session);

        assertSame(existing, result);
        verify(appUserRepository, never()).save(any());
    }

    @Test
    void getOrCreateUser_whenNotExists_createsNew() {
        when(appUserRepository.findBySessionId(session.getId())).thenReturn(Optional.empty());
        when(appUserRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppUser result = subscriptionService.getOrCreateUser(session);

        assertNotNull(result);
        assertEquals(0, result.getTier());
        verify(appUserRepository).save(any());
    }

    @Test
    void upgrade_setsTierToOne() {
        AppUser user = new AppUser(session.getId());
        when(appUserRepository.findBySessionId(session.getId())).thenReturn(Optional.of(user));

        subscriptionService.upgrade(session);

        assertEquals(1, user.getTier());
        verify(appUserRepository).save(user);
    }

    @Test
    void getMaxMatchCount_freeUser_returns20() {
        AppUser freeUser = new AppUser(session.getId());
        when(appUserRepository.findBySessionId(session.getId())).thenReturn(Optional.of(freeUser));

        assertEquals(20, subscriptionService.getMaxMatchCount(session));
    }

    @Test
    void getMaxMatchCount_proUser_returns100() {
        AppUser proUser = new AppUser(session.getId());
        proUser.setTier(1);
        when(appUserRepository.findBySessionId(session.getId())).thenReturn(Optional.of(proUser));

        assertEquals(100, subscriptionService.getMaxMatchCount(session));
    }

    @Test
    void hasAiAccess_freeUser_returnsFalse() {
        AppUser freeUser = new AppUser(session.getId());
        when(appUserRepository.findBySessionId(session.getId())).thenReturn(Optional.of(freeUser));

        assertFalse(subscriptionService.hasAiAccess(session));
    }

    @Test
    void hasAiAccess_proUser_returnsTrue() {
        AppUser proUser = new AppUser(session.getId());
        proUser.setTier(1);
        when(appUserRepository.findBySessionId(session.getId())).thenReturn(Optional.of(proUser));

        assertTrue(subscriptionService.hasAiAccess(session));
    }
}
