package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.security.OAuth2Properties;
import com.jw.backend.service.OAuth2Service;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/oauth2")
public class OAuth2Controller {

    private static final Set<String> SUPPORTED_PROVIDERS = Set.of("google", "discord");

    private final OAuth2Service oAuth2Service;
    private final JwtUtil jwtUtil;
    private final OAuth2Properties oAuth2Properties;

    public OAuth2Controller(OAuth2Service oAuth2Service, JwtUtil jwtUtil, OAuth2Properties oAuth2Properties) {
        this.oAuth2Service = oAuth2Service;
        this.jwtUtil = jwtUtil;
        this.oAuth2Properties = oAuth2Properties;
    }

    @GetMapping("/{provider}/authorize")
    public ResponseEntity<?> authorize(@PathVariable String provider, HttpServletRequest request) {
        String normalizedProvider = provider.toLowerCase();
        if (!SUPPORTED_PROVIDERS.contains(normalizedProvider)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported provider: " + provider));
        }

        if (!oAuth2Service.isProviderConfigured(normalizedProvider)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provider not configured: " + provider));
        }

        String state = oAuth2Service.generateState();
        String callbackUrl = buildCallbackUrl(request, normalizedProvider);
        String authUrl = oAuth2Service.buildAuthorizationUrl(normalizedProvider, state, callbackUrl);

        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(authUrl))
            .build();
    }

    @GetMapping("/{provider}/callback")
    public ResponseEntity<?> callback(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            HttpServletRequest request) {

        String normalizedProvider = provider.toLowerCase();
        if (!SUPPORTED_PROVIDERS.contains(normalizedProvider)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported provider: " + provider));
        }

        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing code or state parameter"));
        }

        if (!oAuth2Service.validateAndConsumeState(state)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired state"));
        }

        try {
            String callbackUrl = buildCallbackUrl(request, normalizedProvider);
            String accessToken = oAuth2Service.exchangeCodeForToken(normalizedProvider, code, callbackUrl);
            OAuth2Service.OAuthUserInfo userInfo = oAuth2Service.fetchUserInfo(normalizedProvider, accessToken);
            AppUser user = oAuth2Service.findOrCreateUser(normalizedProvider, userInfo);
            String jwt = jwtUtil.generateToken(user.getUsername());

            String redirectUrl = oAuth2Properties.getFrontendUrl() + "/oauth-callback?token=" + jwt;
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .build();
        } catch (Exception e) {
            String errorRedirect = oAuth2Properties.getFrontendUrl() + "/oauth-callback?error=auth_failed";
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(errorRedirect))
                .build();
        }
    }

    @GetMapping("/providers")
    public ResponseEntity<?> getAvailableProviders() {
        return ResponseEntity.ok(Map.of(
            "google", oAuth2Service.isProviderConfigured("google"),
            "discord", oAuth2Service.isProviderConfigured("discord")
        ));
    }

    private String buildCallbackUrl(HttpServletRequest request, String provider) {
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();

        // Check for forwarded headers (behind reverse proxy)
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        if (forwardedProto != null) scheme = forwardedProto;

        String base = scheme + "://" + serverName;
        if ((scheme.equals("http") && serverPort != 80) || (scheme.equals("https") && serverPort != 443)) {
            base += ":" + serverPort;
        }

        return base + "/api/oauth2/" + provider + "/callback";
    }
}
