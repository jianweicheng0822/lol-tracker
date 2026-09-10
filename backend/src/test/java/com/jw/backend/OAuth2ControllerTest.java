package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.security.OAuth2Properties;
import com.jw.backend.service.OAuth2Service;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
            .andExpect(header().string("Location", containsString("accounts.google.com")));
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
        when(oAuth2Service.validateAndConsumeState("bad-state")).thenReturn(false);

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "some-code")
                .param("state", "bad-state"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Invalid or expired state"));
    }

    @Test
    void callback_withValidCodeAndState_redirectsWithToken() throws Exception {
        AppUser user = new AppUser("testuser", null, true);
        user.setId(1L);

        when(oAuth2Service.validateAndConsumeState("valid-state")).thenReturn(true);
        when(oAuth2Service.exchangeCodeForToken(eq("google"), eq("auth-code"), anyString()))
            .thenReturn("access-token");
        when(oAuth2Service.fetchUserInfo("google", "access-token"))
            .thenReturn(new OAuth2Service.OAuthUserInfo("google-123", "test@gmail.com", "Test User"));
        when(oAuth2Service.findOrCreateUser("google", new OAuth2Service.OAuthUserInfo("google-123", "test@gmail.com", "Test User")))
            .thenReturn(user);
        when(jwtUtil.generateToken("testuser")).thenReturn("jwt-token-123");

        mockMvc.perform(get("/api/oauth2/google/callback")
                .param("code", "auth-code")
                .param("state", "valid-state"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", "http://localhost:5173/oauth-callback?token=jwt-token-123"));
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
