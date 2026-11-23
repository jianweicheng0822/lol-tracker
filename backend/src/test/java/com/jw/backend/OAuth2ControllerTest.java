package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.security.OAuth2Properties;
import com.jw.backend.service.OAuth2Service;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OAuth2Controller.class)
@AutoConfigureMockMvc(addFilters = false)
class OAuth2ControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OAuth2Service oAuth2Service;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private OAuth2Properties oAuth2Properties;

    @MockitoBean
    private AppUserRepository appUserRepository;

    @BeforeEach
    void setUp() {
        when(oAuth2Properties.getFrontendUrl()).thenReturn("http://localhost:5173");
    }

    @Test
    void authorize_withValidProvider_returns302() throws Exception {
        when(oAuth2Service.isProviderConfigured("google")).thenReturn(true);
        when(oAuth2Service.generateState()).thenReturn("test-state");
        when(oAuth2Service.buildAuthorizationUrl(eq("google"), eq("test-state"), anyString()))
            .thenReturn("https://accounts.google.com/o/oauth2/v2/auth?client_id=test");

        mockMvc.perform(get("/api/oauth2/google/authorize"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", containsString("accounts.google.com")))
            .andExpect(header().string("Set-Cookie", containsString("oauth_state=test-state")))
            .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
            .andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")))
            .andExpect(header().string("Set-Cookie", containsString("Path=/api/oauth2")));
    }

    @Test
    void authorize_whenTooManySignInsPending_returns503() throws Exception {
        when(oAuth2Service.isProviderConfigured("google")).thenReturn(true);
        when(oAuth2Service.generateState()).thenReturn(null);

        mockMvc.perform(get("/api/oauth2/google/authorize"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.error").value("Too many sign-ins in progress. Please try again in a minute."));
    }

    @Test
    void authorize_withUnsupportedProvider_returns400() throws Exception {
        mockMvc.perform(get("/api/oauth2/github/authorize"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Unsupported provider: github"));
    }

    @Test
    void authorize_withUnconfiguredProvider_returns400() throws Exception {
        when(oAuth2Service.isProviderConfigured("google")).thenReturn(false);

        mockMvc.perform(get("/api/oauth2/google/authorize"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Provider not configured: google"));
    }

    @Test
    void callback_withMissingCode_returns400() throws Exception {
        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("state", "some-state"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Missing code or state parameter"));
    }

    @Test
    void callback_withMissingState_returns400() throws Exception {
        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "some-code"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Missing code or state parameter"));
    }

    @Test
    void callback_withInvalidState_returns400() throws Exception {
        when(oAuth2Service.consumeState("bad-state")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "some-code")
                .param("state", "bad-state")
                .cookie(new Cookie("oauth_state", "bad-state")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Invalid or expired state"));
    }

    @Test
    void callback_withValidCodeAndState_redirectsWithToken() throws Exception {
        AppUser user = new AppUser("testuser", null, true);
        user.setId(1L);

        when(oAuth2Service.consumeState("valid-state")).thenReturn(Optional.of(signIn()));
        when(oAuth2Service.exchangeCodeForToken(eq("google"), eq("auth-code"), anyString()))
            .thenReturn("access-token");
        when(oAuth2Service.fetchUserInfo("google", "access-token"))
            .thenReturn(new OAuth2Service.OAuthUserInfo("google-123", "test@gmail.com", "Test User"));
        when(oAuth2Service.findOrCreateUser("google", new OAuth2Service.OAuthUserInfo("google-123", "test@gmail.com", "Test User")))
            .thenReturn(user);
        when(jwtUtil.generateToken("testuser")).thenReturn("jwt-token-123");

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "auth-code")
                .param("state", "valid-state")
                .cookie(new Cookie("oauth_state", "valid-state")))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", "http://localhost:5173/oauth-callback#token=jwt-token-123"))
            // The one-time cookie is cleared
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    void callback_fromABrowserThatDidNotStartTheSignIn_isRejected() throws Exception {
        // An attacker's valid state, sent to a victim whose browser has no matching cookie
        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "attacker-code")
                .param("state", "attacker-state"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Invalid or expired state"));

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "attacker-code")
                .param("state", "attacker-state")
                .cookie(new Cookie("oauth_state", "victims-own-state")))
            .andExpect(status().isBadRequest());

        // Rejected before the state or code is used
        verify(oAuth2Service, never()).consumeState(anyString());
        verify(oAuth2Service, never()).exchangeCodeForToken(anyString(), anyString(), anyString());
    }

    // --- Linking Google/Discord to a logged-in user ---

    private static final Principal ALICE = () -> "alice";

    private static OAuth2Service.PendingState signIn() {
        return new OAuth2Service.PendingState(System.currentTimeMillis(), null);
    }

    private static OAuth2Service.PendingState linkFor(long userId) {
        return new OAuth2Service.PendingState(System.currentTimeMillis(), userId);
    }

    private AppUser alice() {
        AppUser alice = new AppUser("alice", "hashed", true);
        alice.setId(7L);
        when(appUserRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        return alice;
    }

    private void providerReturns(OAuth2Service.OAuthUserInfo info) {
        when(oAuth2Service.exchangeCodeForToken(eq("google"), eq("auth-code"), anyString())).thenReturn("access-token");
        when(oAuth2Service.fetchUserInfo("google", "access-token")).thenReturn(info);
    }

    @Test
    void startLink_withoutLogin_returns401() throws Exception {
        mockMvc.perform(post("/api/oauth2/google/link"))
            .andExpect(status().isUnauthorized());
        verify(oAuth2Service, never()).generateLinkState(any());
    }

    @Test
    void startLink_returnsProviderUrlAndStateCookieForThatUser() throws Exception {
        alice();
        when(oAuth2Service.isProviderConfigured("google")).thenReturn(true);
        when(oAuth2Service.generateLinkState(7L)).thenReturn("link-state");
        when(oAuth2Service.buildAuthorizationUrl(eq("google"), eq("link-state"), anyString()))
            .thenReturn("https://accounts.google.com/o/oauth2/v2/auth?state=link-state");

        mockMvc.perform(post("/api/oauth2/google/link").principal(ALICE))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.url").value("https://accounts.google.com/o/oauth2/v2/auth?state=link-state"))
            .andExpect(header().string("Set-Cookie", containsString("oauth_state=link-state")))
            .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));
    }

    @Test
    void startLink_withUnsupportedProvider_returns400() throws Exception {
        alice();
        mockMvc.perform(post("/api/oauth2/github/link").principal(ALICE))
            .andExpect(status().isBadRequest());
    }

    @Test
    void accounts_listsPasswordAndLinkedProviders() throws Exception {
        AppUser alice = alice();
        when(oAuth2Service.linkedProviders(alice)).thenReturn(List.of("discord"));

        mockMvc.perform(get("/api/oauth2/accounts").principal(ALICE))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.hasPassword").value(true))
            .andExpect(jsonPath("$.linked[0]").value("discord"));
    }

    @Test
    void accounts_withoutLogin_returns401() throws Exception {
        mockMvc.perform(get("/api/oauth2/accounts"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void callback_forALink_linksTheAccountWithoutIssuingAToken() throws Exception {
        AppUser alice = alice();
        OAuth2Service.OAuthUserInfo info = new OAuth2Service.OAuthUserInfo("google-9", "a@gmail.com", "Alice");
        when(oAuth2Service.consumeState("link-state")).thenReturn(Optional.of(linkFor(7L)));
        when(appUserRepository.findById(7L)).thenReturn(Optional.of(alice));
        providerReturns(info);
        when(oAuth2Service.linkAccount(alice, "google", info)).thenReturn(OAuth2Service.LinkResult.LINKED);

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "auth-code")
                .param("state", "link-state")
                .cookie(new Cookie("oauth_state", "link-state")))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", "http://localhost:5173/oauth-callback?linked=google"))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        verify(oAuth2Service, never()).findOrCreateUser(anyString(), any());
        verify(jwtUtil, never()).generateToken(anyString());
    }

    @Test
    void callback_forALink_whenTheAccountBelongsToSomeoneElse_reportsIt() throws Exception {
        AppUser alice = alice();
        OAuth2Service.OAuthUserInfo info = new OAuth2Service.OAuthUserInfo("google-9", null, "Bob");
        when(oAuth2Service.consumeState("link-state")).thenReturn(Optional.of(linkFor(7L)));
        when(appUserRepository.findById(7L)).thenReturn(Optional.of(alice));
        providerReturns(info);
        when(oAuth2Service.linkAccount(alice, "google", info)).thenReturn(OAuth2Service.LinkResult.TAKEN_BY_OTHER_USER);

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "auth-code")
                .param("state", "link-state")
                .cookie(new Cookie("oauth_state", "link-state")))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", "http://localhost:5173/oauth-callback?link_error=taken&provider=google"));
    }

    @Test
    void callback_forALink_whenTheProviderFails_reportsALinkError() throws Exception {
        when(oAuth2Service.consumeState("link-state")).thenReturn(Optional.of(linkFor(7L)));
        when(oAuth2Service.exchangeCodeForToken(eq("google"), eq("auth-code"), anyString()))
            .thenThrow(new RuntimeException("Google is down"));

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "auth-code")
                .param("state", "link-state")
                .cookie(new Cookie("oauth_state", "link-state")))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", "http://localhost:5173/oauth-callback?link_error=auth_failed"));
    }

    @Test
    void providers_returnsConfigurationStatus() throws Exception {
        when(oAuth2Service.isProviderConfigured("google")).thenReturn(true);
        when(oAuth2Service.isProviderConfigured("discord")).thenReturn(false);

        mockMvc.perform(get("/api/oauth2/providers"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.google").value(true))
            .andExpect(jsonPath("$.discord").value(false));
    }
}
