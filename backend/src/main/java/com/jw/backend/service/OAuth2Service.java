package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.OAuthAccount;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.repository.OAuthAccountRepository;
import com.jw.backend.security.OAuth2Properties;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import org.springframework.beans.factory.annotation.Autowired;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OAuth2Service {

    private final OAuth2Properties properties;
    private final OAuthAccountRepository oauthRepository;
    private final AppUserRepository appUserRepository;
    private final RestTemplate restTemplate;

    /**
     * A sign-in or link attempt waiting for the provider to send the user back.
     *
     * @param createdAt  when it started (epoch ms), for the 5-minute expiry
     * @param linkUserId the logged-in user who asked to link this provider, or null for a sign-in
     */
    public record PendingState(long createdAt, Long linkUserId) {
        public boolean isLink() {
            return linkUserId != null;
        }
    }

    /** What happened when a user tried to link a Google/Discord account. */
    public enum LinkResult {
        LINKED,
        /** This Google/Discord account was already linked to this user; nothing changed. */
        ALREADY_LINKED,
        /** This Google/Discord account already signs in to a different user. */
        TAKEN_BY_OTHER_USER,
        /** The user already linked a different account from the same provider. */
        PROVIDER_ALREADY_LINKED
    }

    // In-memory state store with expiry
    private final ConcurrentHashMap<String, PendingState> stateStore = new ConcurrentHashMap<>();
    private static final long STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    /**
     * Anyone can start a sign-in without logging in, so the store is capped: without a cap,
     * repeatedly opening /authorize would grow it until the server ran out of memory.
     * Package-private so tests can lower it.
     */
    int maxPendingStates = 10_000;

    @Autowired
    public OAuth2Service(OAuth2Properties properties,
                         OAuthAccountRepository oauthRepository,
                         AppUserRepository appUserRepository) {
        this.properties = properties;
        this.oauthRepository = oauthRepository;
        this.appUserRepository = appUserRepository;
        this.restTemplate = new RestTemplate();
    }

    // Visible for testing
    OAuth2Service(OAuth2Properties properties,
                  OAuthAccountRepository oauthRepository,
                  AppUserRepository appUserRepository,
                  RestTemplate restTemplate) {
        this.properties = properties;
        this.oauthRepository = oauthRepository;
        this.appUserRepository = appUserRepository;
        this.restTemplate = restTemplate;
    }

    /**
     * Create a one-time state for a sign-in attempt.
     *
     * @return the state, or null when too many sign-ins are pending (the caller should ask the
     *         user to try again shortly)
     */
    public String generateState() {
        return newState(null);
    }

    /**
     * Create a one-time state for linking a provider to a logged-in user. The callback then links
     * the account to that user instead of signing anyone in.
     *
     * @return the state, or null when too many attempts are pending
     */
    public String generateLinkState(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required to link an account");
        return newState(userId);
    }

    private String newState(Long linkUserId) {
        if (stateStore.size() >= maxPendingStates) {
            evictExpiredStates(System.currentTimeMillis());
            if (stateStore.size() >= maxPendingStates) return null;
        }
        String state = UUID.randomUUID().toString();
        stateStore.put(state, new PendingState(System.currentTimeMillis(), linkUserId));
        return state;
    }

    /** Drop sign-in states nobody came back for, so abandoned attempts don't pile up. */
    @Scheduled(fixedRate = 60_000)
    void evictExpiredStates() {
        evictExpiredStates(System.currentTimeMillis());
    }

    void evictExpiredStates(long now) {
        stateStore.values().removeIf(pending -> now - pending.createdAt() >= STATE_TTL_MS);
    }

    int pendingStateCount() {
        return stateStore.size();
    }

    /**
     * Use up a state. Each state works once.
     *
     * @return what the state was for, or empty if it's unknown, already used or expired
     */
    public Optional<PendingState> consumeState(String state) {
        PendingState pending = stateStore.remove(state);
        if (pending == null || System.currentTimeMillis() - pending.createdAt() >= STATE_TTL_MS) {
            return Optional.empty();
        }
        return Optional.of(pending);
    }

    public String buildAuthorizationUrl(String provider, String state, String callbackUrl) {
        OAuth2Properties.ProviderConfig config = properties.getProvider(provider);
        if (config == null || !config.isConfigured()) {
            throw new IllegalArgumentException("Provider not configured: " + provider);
        }

        return switch (provider.toLowerCase()) {
            case "google" -> "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + enc(config.getClientId())
                + "&redirect_uri=" + enc(callbackUrl)
                + "&response_type=code"
                + "&scope=" + enc("openid email profile")
                + "&state=" + enc(state)
                + "&access_type=offline"
                + "&prompt=consent";
            case "discord" -> "https://discord.com/api/oauth2/authorize"
                + "?client_id=" + enc(config.getClientId())
                + "&redirect_uri=" + enc(callbackUrl)
                + "&response_type=code"
                + "&scope=" + enc("identify email")
                + "&state=" + enc(state);
            default -> throw new IllegalArgumentException("Unsupported provider: " + provider);
        };
    }

    @SuppressWarnings("unchecked")
    public String exchangeCodeForToken(String provider, String code, String callbackUrl) {
        OAuth2Properties.ProviderConfig config = properties.getProvider(provider);

        String tokenUrl = switch (provider.toLowerCase()) {
            case "google" -> "https://oauth2.googleapis.com/token";
            case "discord" -> "https://discord.com/api/oauth2/token";
            default -> throw new IllegalArgumentException("Unsupported provider: " + provider);
        };

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("client_id", config.getClientId());
        params.add("client_secret", config.getClientSecret());
        params.add("code", code);
        params.add("grant_type", "authorization_code");
        params.add("redirect_uri", callbackUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<Map> response = restTemplate.exchange(
            tokenUrl,
            HttpMethod.POST,
            new HttpEntity<>(params, headers),
            Map.class
        );

        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("access_token")) {
            throw new RuntimeException("Failed to exchange code for token");
        }

        return (String) body.get("access_token");
    }

    @SuppressWarnings("unchecked")
    public OAuthUserInfo fetchUserInfo(String provider, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        return switch (provider.toLowerCase()) {
            case "google" -> {
                ResponseEntity<Map> response = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
                );
                Map<String, Object> body = response.getBody();
                if (body == null) throw new RuntimeException("Empty Google user info");

                String id = (String) body.get("sub");
                String email = (String) body.get("email");
                Boolean emailVerified = (Boolean) body.get("email_verified");
                String name = (String) body.get("name");

                // Only trust verified emails from Google
                yield new OAuthUserInfo(id, emailVerified != null && emailVerified ? email : null, name);
            }
            case "discord" -> {
                ResponseEntity<Map> response = restTemplate.exchange(
                    "https://discord.com/api/users/@me",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
                );
                Map<String, Object> body = response.getBody();
                if (body == null) throw new RuntimeException("Empty Discord user info");

                // Discord ID is numeric but returned as string in some cases
                String id = String.valueOf(body.get("id"));
                String email = (String) body.get("email");
                Boolean emailVerified = (Boolean) body.get("verified");
                String name = (String) body.get("username");

                yield new OAuthUserInfo(id, emailVerified != null && emailVerified ? email : null, name);
            }
            default -> throw new IllegalArgumentException("Unsupported provider: " + provider);
        };
    }

    public AppUser findOrCreateUser(String provider, OAuthUserInfo info) {
        // 1. Check if OAuth account already exists
        Optional<OAuthAccount> existingOAuth = oauthRepository.findByProviderAndProviderId(provider, info.id());
        if (existingOAuth.isPresent()) {
            return existingOAuth.get().getUser();
        }

        // 2. Try to link by email if available
        AppUser user = null;
        if (info.email() != null && !info.email().isBlank()) {
            Optional<AppUser> byEmail = appUserRepository.findByEmail(info.email());
            if (byEmail.isPresent()) {
                user = byEmail.get();
            }
        }

        // 3. Create new user if no match found
        if (user == null) {
            String username = generateUniqueUsername(provider, info.name());
            user = new AppUser(username, null, true);
            if (info.email() != null && !info.email().isBlank()) {
                user.setEmail(info.email());
            }
            user = appUserRepository.save(user);
        } else if (user.getEmail() == null && info.email() != null) {
            user.setEmail(info.email());
            user = appUserRepository.save(user);
        }

        // 4. Create OAuth account link
        OAuthAccount oauthAccount = new OAuthAccount(provider, info.id(), info.email());
        oauthAccount.setUser(user);
        oauthRepository.save(oauthAccount);

        return user;
    }

    /**
     * Link a Google/Discord account to a user who is already logged in, so they can sign in with it
     * later (for example after forgetting their password). Unlike sign-in, this never matches by
     * email and never creates a user.
     */
    public LinkResult linkAccount(AppUser user, String provider, OAuthUserInfo info) {
        Optional<OAuthAccount> existing = oauthRepository.findByProviderAndProviderId(provider, info.id());
        if (existing.isPresent()) {
            return existing.get().getUser().getId().equals(user.getId())
                ? LinkResult.ALREADY_LINKED
                : LinkResult.TAKEN_BY_OTHER_USER;
        }
        boolean hasThisProvider = oauthRepository.findAllByUser(user).stream()
            .anyMatch(account -> account.getProvider().equals(provider));
        if (hasThisProvider) {
            return LinkResult.PROVIDER_ALREADY_LINKED;
        }

        OAuthAccount account = new OAuthAccount(provider, info.id(), info.email());
        account.setUser(user);
        try {
            oauthRepository.save(account);
        } catch (DataIntegrityViolationException e) {
            // Someone linked or signed up with this same account at the same moment (unique index)
            return LinkResult.TAKEN_BY_OTHER_USER;
        }
        return LinkResult.LINKED;
    }

    /** The providers ("google", "discord") linked to this user, sorted. */
    public List<String> linkedProviders(AppUser user) {
        return oauthRepository.findAllByUser(user).stream()
            .map(OAuthAccount::getProvider)
            .distinct()
            .sorted()
            .toList();
    }

    private String generateUniqueUsername(String provider, String displayName) {
        String base = displayName != null && !displayName.isBlank()
            ? displayName.replaceAll("[^a-zA-Z0-9_]", "")
            : provider;
        if (base.isBlank()) base = provider;
        if (base.length() > 40) base = base.substring(0, 40);

        String candidate = base;
        int suffix = 1;
        while (appUserRepository.findByUsername(candidate).isPresent()) {
            candidate = base + suffix;
            suffix++;
        }
        return candidate;
    }

    public boolean isProviderConfigured(String provider) {
        OAuth2Properties.ProviderConfig config = properties.getProvider(provider);
        return config != null && config.isConfigured();
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record OAuthUserInfo(String id, String email, String name) {}
}
