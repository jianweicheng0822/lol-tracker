/**
 * @file OAuthLinkIntegrationTest.java
 * @description Linking Google/Discord to existing accounts, with several users, against a real database.
 * @module backend.test
 */
package com.jw.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.repository.OAuthAccountRepository;
import com.jw.backend.service.OAuth2Service;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real controller, service, JWT filter and Postgres. Only Google's and Discord's servers are faked,
 * at the HTTP level, so the token exchange and user-info parsing run for real too.
 * Each "code" stands for one person finishing the provider's consent screen as a given
 * Google/Discord account.
 */
class OAuthLinkIntegrationTest extends BaseIntegrationSupport {

    private static final String FRONTEND = "http://localhost:5173";

    @DynamicPropertySource
    static void oauthProviders(DynamicPropertyRegistry registry) {
        registry.add("oauth2.google.client-id", () -> "test-google-id");
        registry.add("oauth2.google.client-secret", () -> "test-google-secret");
        registry.add("oauth2.discord.client-id", () -> "test-discord-id");
        registry.add("oauth2.discord.client-secret", () -> "test-discord-secret");
        registry.add("oauth2.frontend-url", () -> FRONTEND);
    }

    @Autowired
    private OAuth2Service oAuth2Service;

    private MockRestServiceServer providers;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private OAuthAccountRepository oauthAccountRepository;

    /** Fake provider accounts: code -> who the provider says signed in. */
    @BeforeEach
    void fakeProviders() {
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(oAuth2Service, "restTemplate");
        providers = MockRestServiceServer.bindTo(restTemplate).ignoreExpectOrder(true).build();
        provider("google", "code-alice-google", "g-alice", "alice.link@gmail.com", "Alice");
        provider("google", "code-bob-google", "g-bob", "bob.link@gmail.com", "Bob");
        provider("google", "code-carol-google", "g-carol", null, "Carol");
        provider("discord", "code-carol-discord", "d-carol", "carol.link@example.com", "carol_d");
        provider("discord", "code-dave-discord", "d-dave", null, "李明");
        provider("google", "code-ivy-google", "g-ivy", "ivy.link@gmail.com", "Ivy");
        provider("google", "code-frank-google", "g-frank", "frank.link@gmail.com", "Frank");
        provider("google", "code-frank-google-2", "g-frank-2", "frank.second@gmail.com", "Frank Two");
    }

    /** Make the fake Google/Discord answer for one account, as their real APIs would. */
    private void provider(String provider, String code, String id, String email, String name) {
        boolean google = provider.equals("google");
        String tokenUrl = google ? "https://oauth2.googleapis.com/token" : "https://discord.com/api/oauth2/token";
        String userUrl = google ? "https://www.googleapis.com/oauth2/v3/userinfo" : "https://discord.com/api/users/@me";

        providers.expect(ExpectedCount.manyTimes(), requestTo(tokenUrl))
            .andExpect(method(POST))
            .andExpect(content().string(containsString("code=" + code + "&")))
            .andRespond(withSuccess(json(Map.of("access_token", "token-" + code)), MediaType.APPLICATION_JSON));

        Map<String, Object> user = new LinkedHashMap<>();
        user.put(google ? "sub" : "id", id);
        user.put("email", email);
        user.put(google ? "email_verified" : "verified", email != null);
        user.put(google ? "name" : "username", name);
        providers.expect(ExpectedCount.manyTimes(), requestTo(userUrl))
            .andExpect(method(GET))
            .andExpect(header("Authorization", "Bearer token-" + code))
            .andRespond(withSuccess(json(user), MediaType.APPLICATION_JSON));
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }

    // --- helpers that act like the browser ---

    private String register(String username) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"password123\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    /** Click "Link": returns the one-time state, which the browser also holds as a cookie. */
    private String startLink(String jwt, String provider) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/oauth2/" + provider + "/link")
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isOk())
            .andReturn();
        String url = objectMapper.readTree(res.getResponse().getContentAsString()).get("url").asText();
        String state = res.getResponse().getCookie("oauth_state").getValue();
        assertTrue(url.contains("state=" + state), "provider URL carries the same state as the cookie");
        return state;
    }

    /** Click "Continue with …" on the login dialog (no login). */
    private String startSignIn(String provider) throws Exception {
        MvcResult res = mockMvc.perform(get("/api/oauth2/" + provider + "/authorize"))
            .andExpect(status().isFound())
            .andReturn();
        return res.getResponse().getCookie("oauth_state").getValue();
    }

    /** The provider sends the browser back. Returns where we redirect it. */
    private String callback(String provider, String code, String state, String cookieState) throws Exception {
        var request = get("/api/oauth2/" + provider + "/callback").param("code", code).param("state", state);
        if (cookieState != null) request.cookie(new Cookie("oauth_state", cookieState));
        return mockMvc.perform(request).andReturn().getResponse().getHeader("Location");
    }

    private String link(String jwt, String provider, String code) throws Exception {
        String state = startLink(jwt, provider);
        return callback(provider, code, state, state);
    }

    /** Sign in with a provider; returns the username in the JWT we hand back. */
    private String signInAs(String provider, String code) throws Exception {
        String state = startSignIn(provider);
        String location = callback(provider, code, state, state);
        assertNotNull(location);
        assertTrue(location.startsWith(FRONTEND + "/oauth-callback#token="), "signed in: " + location);
        String jwt = location.substring(location.indexOf("#token=") + 7);
        accounts(jwt); // the token works on a logged-in-only endpoint
        return usernameOf(jwt);
    }

    private String usernameOf(String jwt) {
        String payload = new String(java.util.Base64.getUrlDecoder().decode(jwt.split("\\.")[1]));
        try {
            return objectMapper.readTree(payload).get("sub").asText();
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }

    private JsonNode accounts(String jwt) throws Exception {
        MvcResult res = mockMvc.perform(get("/api/oauth2/accounts").header("Authorization", "Bearer " + jwt))
            .andExpect(status().isOk())
            .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString());
    }

    private List<String> linked(String jwt) throws Exception {
        List<String> providers = new java.util.ArrayList<>();
        accounts(jwt).get("linked").forEach(p -> providers.add(p.asText()));
        return providers;
    }

    // --- scenarios ---

    @Test
    void aPasswordUserLinksGoogle_thenCanSignInWithIt() throws Exception {
        String alice = register("link_alice");
        assertEquals(List.of(), linked(alice));
        assertTrue(accounts(alice).get("hasPassword").asBoolean());

        assertEquals(FRONTEND + "/oauth-callback?linked=google", link(alice, "google", "code-alice-google"));
        assertEquals(List.of("google"), linked(alice));

        // Forgot the password: Google now gets them into the same account, not a new one
        long usersBefore = appUserRepository.count();
        assertEquals("link_alice", signInAs("google", "code-alice-google"));
        assertEquals(usersBefore, appUserRepository.count());
    }

    @Test
    void aGoogleAccountCanOnlyBelongToOneUser() throws Exception {
        String bob = register("link_bob");
        String eve = register("link_eve");
        link(bob, "google", "code-bob-google");

        // Eve tries to attach Bob's Google account to her account
        assertEquals(FRONTEND + "/oauth-callback?link_error=taken&provider=google", link(eve, "google", "code-bob-google"));
        assertEquals(List.of(), linked(eve));
        assertEquals(List.of("google"), linked(bob));
        // ...and signing in with it still opens Bob's account
        assertEquals("link_bob", signInAs("google", "code-bob-google"));
    }

    @Test
    void oneAccountPerProvider_andRelinkingIsHarmless() throws Exception {
        String frank = register("link_frank");
        link(frank, "google", "code-frank-google");

        // A second, different Google account is refused
        assertEquals(FRONTEND + "/oauth-callback?link_error=provider_linked&provider=google",
            link(frank, "google", "code-frank-google-2"));

        // Linking the same one again just says linked, without a duplicate row
        long rowsBefore = oauthAccountRepository.count();
        assertEquals(FRONTEND + "/oauth-callback?linked=google", link(frank, "google", "code-frank-google"));
        assertEquals(rowsBefore, oauthAccountRepository.count());
        assertEquals(List.of("google"), linked(frank));
    }

    @Test
    void aDiscordSignUpWithoutPassword_canAddGoogle() throws Exception {
        // Carol never registered with a password: Discord creates her account
        String state = startSignIn("discord");
        String location = callback("discord", "code-carol-discord", state, state);
        String carol = location.substring(location.indexOf("#token=") + 7);

        JsonNode before = accounts(carol);
        assertFalse(before.get("hasPassword").asBoolean());
        assertEquals(List.of("discord"), linked(carol));

        assertEquals(FRONTEND + "/oauth-callback?linked=google", link(carol, "google", "code-carol-google"));
        assertEquals(List.of("discord", "google"), linked(carol));
        // Both providers open the same account
        String username = usernameOf(carol);
        assertEquals(username, signInAs("google", "code-carol-google"));
        assertEquals(username, signInAs("discord", "code-carol-discord"));
    }

    @Test
    void linkingNeedsALogin() throws Exception {
        mockMvc.perform(post("/api/oauth2/google/link")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/oauth2/google/link").header("Authorization", "Bearer not-a-real-token"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/oauth2/accounts")).andExpect(status().isUnauthorized());
    }

    @Test
    void aLinkCantBeFinishedInSomeoneElsesBrowserOrReused() throws Exception {
        String grace = register("link_grace");
        String henry = register("link_henry");

        // Grace starts a link and sends the provider link to Henry. Henry's browser has no
        // matching cookie, so his Discord account is NOT attached to Grace's account.
        String graceState = startLink(grace, "discord");
        String henryLocation = callback("discord", "code-dave-discord", graceState, null);
        assertNull(henryLocation, "rejected with 400, no redirect");
        assertEquals(List.of(), linked(grace));

        // Henry's own cookie doesn't help either
        String henryState = startLink(henry, "discord");
        assertNull(callback("discord", "code-dave-discord", graceState, henryState));
        assertEquals(List.of(), linked(grace));

        // Henry finishes his own link; the same state can't be used a second time
        assertEquals(FRONTEND + "/oauth-callback?linked=discord", callback("discord", "code-dave-discord", henryState, henryState));
        assertNull(callback("discord", "code-dave-discord", henryState, henryState));
        assertEquals(List.of("discord"), linked(henry));
    }

    @Test
    void linkingDoesntChangeTheUsernameOrIssueANewLogin() throws Exception {
        String ivy = register("link_ivy");
        String location = link(ivy, "google", "code-ivy-google");

        assertEquals(FRONTEND + "/oauth-callback?linked=google", location);
        assertFalse(location.contains("token="), "no new JWT for a link");
        var user = appUserRepository.findByUsername("link_ivy").orElseThrow();
        assertNull(user.getEmail(), "linking never sets or matches by email");
        assertEquals("link_ivy", usernameOf(ivy));
    }
}
