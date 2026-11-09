package com.jw.backend.metrics;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UsageEventServiceTest {

    private static final String CHROME = "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0";

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-08T12:00:00Z"), ZoneOffset.UTC);
    // Runs the insert on the calling thread so the test can check it
    private final UsageEventService service = new UsageEventService(jdbc, Runnable::run, "salt", 3, 180, clock);

    @Test
    void record_savesWithVisitorHeaderAndUsername() {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/summoner");
        req.addHeader("User-Agent", CHROME);
        req.addHeader("X-Visitor-Id", "0123456789abcdef-xyz");
        req.setUserPrincipal(() -> "alice");

        service.record("player_view", "NA", req);

        verify(jdbc).update(startsWith("INSERT INTO usage_events"),
                eq("player_view"), eq("0123456789abcdef-xyz"), eq("alice"), eq("NA"));
    }

    @Test
    void record_skipsBotsAndMissingUserAgents() {
        for (String ua : new String[]{null, "", "Googlebot/2.1", "curl/8.4", "Mozilla/5.0 HeadlessChrome/130"}) {
            MockHttpServletRequest req = new MockHttpServletRequest();
            if (ua != null) req.addHeader("User-Agent", ua);
            service.record("page_view", "home", req);
        }
        verifyNoInteractions(jdbc);
    }

    @Test
    void record_stopsAtTheDailyCap() {
        for (int i = 0; i < 5; i++) service.record("page_view", "home", "visitor-id-000001", null);
        verify(jdbc, times(3)).update(anyString(), any(), any(), any(), any());
    }

    @Test
    void visitorId_fallsBackToADailyHashWithoutTheRawIp() {
        String id = service.visitorId(null, "203.0.113.9", CHROME);
        assertTrue(id.startsWith("ip-"));
        assertEquals(27, id.length());
        assertFalse(id.contains("203.0.113.9"));
        assertEquals(id, service.visitorId("bad id!", "203.0.113.9", CHROME));
        assertNotEquals(id, service.visitorId(null, "203.0.113.10", CHROME));

        UsageEventService tomorrow = new UsageEventService(jdbc, Runnable::run, "salt", 3, 180,
                Clock.offset(clock, java.time.Duration.ofDays(1)));
        assertNotEquals(id, tomorrow.visitorId(null, "203.0.113.9", CHROME));
    }

    @Test
    void record_truncatesLongDetails() {
        service.record("page_view", "x".repeat(300), "visitor-id-000001", null);
        verify(jdbc).update(anyString(), any(), any(), isNull(), eq("x".repeat(UsageEventService.DETAIL_MAX)));
    }
}
