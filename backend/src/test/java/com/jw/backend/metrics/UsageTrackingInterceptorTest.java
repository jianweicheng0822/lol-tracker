package com.jw.backend.metrics;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UsageTrackingInterceptorTest {

    @SuppressWarnings("unchecked")
    private final ObjectProvider<UsageEventService> provider = mock(ObjectProvider.class);
    private final UsageEventService service = mock(UsageEventService.class);
    private final UsageTrackingInterceptor interceptor = new UsageTrackingInterceptor(provider);

    @Test
    void eventFor_mapsFeatureCalls() {
        assertEquals("player_view", UsageTrackingInterceptor.eventFor("GET", "/api/summoner"));
        assertEquals("player_view", UsageTrackingInterceptor.eventFor("GET", "/api/summoner/by-puuid"));
        assertEquals("match_detail", UsageTrackingInterceptor.eventFor("GET", "/api/matches/full-detail"));
        assertEquals("live_game", UsageTrackingInterceptor.eventFor("GET", "/api/live-game"));
        assertEquals("leaderboard", UsageTrackingInterceptor.eventFor("GET", "/api/leaderboard"));
        assertEquals("login_oauth", UsageTrackingInterceptor.eventFor("GET", "/api/oauth2/google/callback"));
        assertEquals("multi_search", UsageTrackingInterceptor.eventFor("POST", "/api/multi-search"));
        assertEquals("ai_analysis", UsageTrackingInterceptor.eventFor("POST", "/api/analyze/stream"));
        assertEquals("signup", UsageTrackingInterceptor.eventFor("POST", "/api/auth/register"));
        assertEquals("checkout_start", UsageTrackingInterceptor.eventFor("POST", "/api/checkout/session"));
    }

    @Test
    void eventFor_ignoresEverythingElse() {
        assertNull(UsageTrackingInterceptor.eventFor("GET", "/api/matches/summary"));
        assertNull(UsageTrackingInterceptor.eventFor("GET", "/api/admin/usage"));
        assertNull(UsageTrackingInterceptor.eventFor("POST", "/api/summoner"));
        assertNull(UsageTrackingInterceptor.eventFor("DELETE", "/api/favorites"));
        assertNull(UsageTrackingInterceptor.eventFor("POST", "/api/nav"));
    }

    @Test
    void afterCompletion_recordsSuccessWithRegion() {
        when(provider.getIfAvailable()).thenReturn(service);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/summoner");
        req.setParameter("region", "EUW");

        interceptor.afterCompletion(req, new MockHttpServletResponse(), null, null);

        verify(service).record("player_view", "EUW", req);
    }

    @Test
    void afterCompletion_skipsFailures() {
        when(provider.getIfAvailable()).thenReturn(service);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/summoner");
        MockHttpServletResponse notFound = new MockHttpServletResponse();
        notFound.setStatus(404);

        interceptor.afterCompletion(req, notFound, null, null);
        interceptor.afterCompletion(req, new MockHttpServletResponse(), null, new RuntimeException("boom"));

        verifyNoInteractions(service);
    }

    @Test
    void oauthCallback_countsOnlyRedirectsWithAToken() {
        when(provider.getIfAvailable()).thenReturn(service);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/oauth2/discord/callback");

        MockHttpServletResponse failed = new MockHttpServletResponse();
        failed.setStatus(302);
        failed.setHeader("Location", "https://loltracker.lol/oauth-callback#error=denied");
        interceptor.afterCompletion(req, failed, null, null);
        verifyNoInteractions(service);

        MockHttpServletResponse ok = new MockHttpServletResponse();
        ok.setStatus(302);
        ok.setHeader("Location", "https://loltracker.lol/oauth-callback#token=abc");
        interceptor.afterCompletion(req, ok, null, null);
        verify(service).record(eq("login_oauth"), eq("discord"), any());
    }

    @Test
    void noService_doesNothing() {
        when(provider.getIfAvailable()).thenReturn(null);
        assertDoesNotThrow(() -> interceptor.afterCompletion(
                new MockHttpServletRequest("POST", "/api/auth/login"), new MockHttpServletResponse(), null, null));
    }
}
