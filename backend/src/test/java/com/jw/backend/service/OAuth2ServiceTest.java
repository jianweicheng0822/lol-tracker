package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.OAuthAccount;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.repository.OAuthAccountRepository;
import com.jw.backend.security.OAuth2Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2ServiceTest {

    @Mock
    private OAuthAccountRepository oauthRepository;

    @Mock
    private AppUserRepository appUserRepository;

    private OAuth2Properties properties;
    private OAuth2Service service;

    @BeforeEach
    void setUp() {
        properties = new OAuth2Properties();
        OAuth2Properties.ProviderConfig google = new OAuth2Properties.ProviderConfig();
        google.setClientId("google-client-id");
        google.setClientSecret("google-client-secret");
        properties.setGoogle(google);

        OAuth2Properties.ProviderConfig discord = new OAuth2Properties.ProviderConfig();
        discord.setClientId("discord-client-id");
        discord.setClientSecret("discord-client-secret");
        properties.setDiscord(discord);

        properties.setFrontendUrl("http://localhost:5173");

        service = new OAuth2Service(properties, oauthRepository, appUserRepository);
    }

    @Test
    void findOrCreateUser_existingOAuth_returnsExistingUser() {
        AppUser existingUser = new AppUser("testuser", null, true);
        existingUser.setId(1L);

        OAuthAccount existingOAuth = new OAuthAccount("google", "google-123", "test@gmail.com");
        existingOAuth.setUser(existingUser);

        when(oauthRepository.findByProviderAndProviderId("google", "google-123"))
            .thenReturn(Optional.of(existingOAuth));

        OAuth2Service.OAuthUserInfo info = new OAuth2Service.OAuthUserInfo("google-123", "test@gmail.com", "Test User");
        AppUser result = service.findOrCreateUser("google", info);

        assertEquals(existingUser, result);
        verify(appUserRepository, never()).save(any());
        verify(oauthRepository, never()).save(any());
    }

    @Test
    void findOrCreateUser_newUser_createsUserAndOAuth() {
        when(oauthRepository.findByProviderAndProviderId("google", "google-456"))
            .thenReturn(Optional.empty());
        when(appUserRepository.findByEmail("new@gmail.com")).thenReturn(Optional.empty());
        when(appUserRepository.findByUsername("NewUser")).thenReturn(Optional.empty());
        when(appUserRepository.save(any())).thenAnswer(inv -> {
            AppUser u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });

        OAuth2Service.OAuthUserInfo info = new OAuth2Service.OAuthUserInfo("google-456", "new@gmail.com", "NewUser");
        AppUser result = service.findOrCreateUser("google", info);

        assertNotNull(result);
        assertEquals("NewUser", result.getUsername());
        assertEquals("new@gmail.com", result.getEmail());

        verify(appUserRepository).save(any(AppUser.class));
        ArgumentCaptor<OAuthAccount> oauthCaptor = ArgumentCaptor.forClass(OAuthAccount.class);
        verify(oauthRepository).save(oauthCaptor.capture());
        assertEquals("google", oauthCaptor.getValue().getProvider());
        assertEquals("google-456", oauthCaptor.getValue().getProviderId());
    }

    @Test
    void findOrCreateUser_emailMatchesExistingUser_linksOAuth() {
        AppUser existingUser = new AppUser("existing", "hashed", true);
        existingUser.setId(3L);
        existingUser.setEmail("shared@gmail.com");

        when(oauthRepository.findByProviderAndProviderId("google", "google-789"))
            .thenReturn(Optional.empty());
        when(appUserRepository.findByEmail("shared@gmail.com")).thenReturn(Optional.of(existingUser));

        OAuth2Service.OAuthUserInfo info = new OAuth2Service.OAuthUserInfo("google-789", "shared@gmail.com", "Existing User");
        AppUser result = service.findOrCreateUser("google", info);

        assertEquals(existingUser, result);
        // Should not create a new AppUser
        verify(appUserRepository, never()).save(any());
        // Should create OAuthAccount linking to existing user
        ArgumentCaptor<OAuthAccount> captor = ArgumentCaptor.forClass(OAuthAccount.class);
        verify(oauthRepository).save(captor.capture());
        assertEquals(existingUser, captor.getValue().getUser());
    }

    @Test
    void buildAuthorizationUrl_google_containsRequiredParams() {
        String url = service.buildAuthorizationUrl("google", "test-state", "http://localhost:8080/api/oauth2/google/callback");

        assertTrue(url.contains("accounts.google.com"));
        assertTrue(url.contains("client_id=google-client-id"));
        assertTrue(url.contains("state=test-state"));
        assertTrue(url.contains("response_type=code"));
        assertTrue(url.contains("scope="));
    }

    @Test
    void buildAuthorizationUrl_discord_containsRequiredParams() {
        String url = service.buildAuthorizationUrl("discord", "test-state", "http://localhost:8080/api/oauth2/discord/callback");

        assertTrue(url.contains("discord.com"));
        assertTrue(url.contains("client_id=discord-client-id"));
        assertTrue(url.contains("state=test-state"));
    }

    @Test
    void generateAndValidateState_works() {
        String state = service.generateState();
        assertNotNull(state);
        assertTrue(service.validateAndConsumeState(state));
        // Second use should fail (one-time)
        assertFalse(service.validateAndConsumeState(state));
    }

    @Test
    void validateState_invalidState_returnsFalse() {
        assertFalse(service.validateAndConsumeState("nonexistent-state"));
    }

    @Test
    void isProviderConfigured_returnsCorrectStatus() {
        assertTrue(service.isProviderConfigured("google"));
        assertTrue(service.isProviderConfigured("discord"));

        OAuth2Properties emptyProps = new OAuth2Properties();
        OAuth2Service emptyService = new OAuth2Service(emptyProps, oauthRepository, appUserRepository);
        assertFalse(emptyService.isProviderConfigured("google"));
    }

    @Test
    void findOrCreateUser_usernameConflict_appendsSuffix() {
        when(oauthRepository.findByProviderAndProviderId("discord", "discord-111"))
            .thenReturn(Optional.empty());
        when(appUserRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(appUserRepository.findByUsername("TakenName")).thenReturn(Optional.of(new AppUser()));
        when(appUserRepository.findByUsername("TakenName1")).thenReturn(Optional.empty());
        when(appUserRepository.save(any())).thenAnswer(inv -> {
            AppUser u = inv.getArgument(0);
            u.setId(5L);
            return u;
        });

        OAuth2Service.OAuthUserInfo info = new OAuth2Service.OAuthUserInfo("discord-111", "user@test.com", "TakenName");
        AppUser result = service.findOrCreateUser("discord", info);

        assertEquals("TakenName1", result.getUsername());
    }
}
