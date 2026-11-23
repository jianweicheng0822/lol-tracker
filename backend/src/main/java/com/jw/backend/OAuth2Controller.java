package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.security.OAuth2Properties;
import com.jw.backend.service.OAuth2Service;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.Principal;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/oauth2")
public class OAuth2Controller {

    private static final Set<String> SUPPORTED_PROVIDERS = Set.of("google", "discord");

    /**
     * Ties a sign-in to the browser that started it. Without it, someone could start a sign-in
     * with their own account and send the callback link to a victim, who would end up logged in
     * as the attacker (login CSRF). Lax still sends it on the provider's top-level redirect back.
     */
    static final String STATE_COOKIE = "oauth_state";
    private static final String STATE_COOKIE_PATH = "/api/oauth2";
    private static final Duration STATE_COOKIE_TTL = Duration.ofMinutes(5);

    private final OAuth2Service oAuth2Service;
    private final JwtUtil jwtUtil;
    private final OAuth2Properties oAuth2Properties;
    private final AppUserRepository appUserRepository;

    public OAuth2Controller(OAuth2Service oAuth2Service, JwtUtil jwtUtil, OAuth2Properties oAuth2Properties,
                            AppUserRepository appUserRepository) {
        this.oAuth2Service = oAuth2Service;
        this.jwtUtil = jwtUtil;
        this.oAuth2Properties = oAuth2Properties;
        this.appUserRepository = appUserRepository;
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
        if (state == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Too many sign-ins in progress. Please try again in a minute."));
        }
        String callbackUrl = buildCallbackUrl(request, normalizedProvider);
        String authUrl = oAuth2Service.buildAuthorizationUrl(normalizedProvider, state, callbackUrl);

        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(authUrl))
            .header(HttpHeaders.SET_COOKIE, stateCookie(state, STATE_COOKIE_TTL, request).toString())
            .build();
    }

    /**
     * Start linking Google/Discord to the logged-in user. It's a POST with the usual Bearer token
     * (the browser can't send that header on a plain redirect), so it answers with the provider URL
     * for the page to open, plus the same state cookie a sign-in gets.
     */
    @PostMapping("/{provider}/link")
    public ResponseEntity<?> startLink(@PathVariable String provider, Principal principal, HttpServletRequest request) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        String normalizedProvider = provider.toLowerCase();
        if (!SUPPORTED_PROVIDERS.contains(normalizedProvider)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported provider: " + provider));
        }
        if (!oAuth2Service.isProviderConfigured(normalizedProvider)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provider not configured: " + provider));
        }

        String state = oAuth2Service.generateLinkState(user.getId());
        if (state == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Too many sign-ins in progress. Please try again in a minute."));
        }
        String authUrl = oAuth2Service.buildAuthorizationUrl(
            normalizedProvider, state, buildCallbackUrl(request, normalizedProvider));
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, stateCookie(state, STATE_COOKIE_TTL, request).toString())
            .body(Map.of("url", authUrl));
    }

    /** How the logged-in user can sign in: with a password, and/or which providers are linked. */
    @GetMapping("/accounts")
    public ResponseEntity<?> linkedAccounts(Principal principal) {
        AppUser user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("hasPassword", user.getPassword() != null);
        body.put("linked", oAuth2Service.linkedProviders(user));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{provider}/callback")
    public ResponseEntity<?> callback(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @CookieValue(name = STATE_COOKIE, required = false) String cookieState,
            HttpServletRequest request) {

        String normalizedProvider = provider.toLowerCase();
        if (!SUPPORTED_PROVIDERS.contains(normalizedProvider)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported provider: " + provider));
        }

        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing code or state parameter"));
        }

        // The state must come back to the browser that started the sign-in, and be one we issued
        Optional<OAuth2Service.PendingState> pending =
            sameState(state, cookieState) ? oAuth2Service.consumeState(state) : Optional.empty();
        if (pending.isEmpty()) {
            return ResponseEntity.badRequest()
                .header(HttpHeaders.SET_COOKIE, stateCookie("", Duration.ZERO, request).toString())
                .body(Map.of("error", "Invalid or expired state"));
        }

        try {
            String callbackUrl = buildCallbackUrl(request, normalizedProvider);
            String accessToken = oAuth2Service.exchangeCodeForToken(normalizedProvider, code, callbackUrl);
            OAuth2Service.OAuthUserInfo userInfo = oAuth2Service.fetchUserInfo(normalizedProvider, accessToken);

            if (pending.get().isLink()) {
                return finishLink(pending.get().linkUserId(), normalizedProvider, userInfo, request);
            }

            AppUser user = oAuth2Service.findOrCreateUser(normalizedProvider, userInfo);
            String jwt = jwtUtil.generateToken(user.getUsername());

            // In the fragment, not the query: browsers never send fragments to the server, so the
            // token stays out of nginx access logs (the frontend also drops it from history)
            String redirectUrl = oAuth2Properties.getFrontendUrl() + "/oauth-callback#token=" + jwt;
            return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .header(HttpHeaders.SET_COOKIE, stateCookie("", Duration.ZERO, request).toString())
                .build();
        } catch (Exception e) {
            String errorQuery = pending.get().isLink() ? "link_error=auth_failed" : "error=auth_failed";
            String errorRedirect = oAuth2Properties.getFrontendUrl() + "/oauth-callback?" + errorQuery;
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

    /**
     * Link the provider account to the user who started the link. No token is issued: they're
     * already logged in in this browser, and keep that session.
     */
    private ResponseEntity<?> finishLink(Long userId, String provider, OAuth2Service.OAuthUserInfo info,
                                         HttpServletRequest request) {
        String query;
        Optional<AppUser> user = appUserRepository.findById(userId);
        if (user.isEmpty()) {
            query = "link_error=auth_failed";
        } else {
            query = switch (oAuth2Service.linkAccount(user.get(), provider, info)) {
                case LINKED, ALREADY_LINKED -> "linked=" + provider;
                case TAKEN_BY_OTHER_USER -> "link_error=taken&provider=" + provider;
                case PROVIDER_ALREADY_LINKED -> "link_error=provider_linked&provider=" + provider;
            };
        }
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(oAuth2Properties.getFrontendUrl() + "/oauth-callback?" + query))
            .header(HttpHeaders.SET_COOKIE, stateCookie("", Duration.ZERO, request).toString())
            .build();
    }

    private AppUser resolveUser(Principal principal) {
        if (principal == null) return null;
        return appUserRepository.findByUsername(principal.getName()).orElse(null);
    }

    private static ResponseCookie stateCookie(String value, Duration maxAge, HttpServletRequest request) {
        return ResponseCookie.from(STATE_COOKIE, value)
            .httpOnly(true)
            .secure(request.isSecure())
            .sameSite("Lax")
            .path(STATE_COOKIE_PATH)
            .maxAge(maxAge)
            .build();
    }

    private static boolean sameState(String state, String cookieState) {
        return cookieState != null && MessageDigest.isEqual(
            state.getBytes(StandardCharsets.UTF_8), cookieState.getBytes(StandardCharsets.UTF_8));
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
