package com.jw.backend.integration;

import com.jw.backend.metrics.MetricsReport;
import com.jw.backend.metrics.MetricsService;
import com.jw.backend.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Usage events recorded through the real endpoints and aggregated by the real SQL. */
@TestPropertySource(properties = {"admin.usernames=metricsadmin", "metrics.zone=America/Denver"})
class MetricsIntegrationTest extends BaseIntegrationSupport {

    private static final String BROWSER = "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0";
    private static final String A = "aaaaaaaaaaaaaaaa-1";
    private static final String B = "bbbbbbbbbbbbbbbb-1";
    private static final String C = "cccccccccccccccc-1";
    private static final String ADMIN_BROWSER = "dddddddddddddddd-1";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private MetricsService metricsService;

    @Autowired
    private JwtUtil jwtUtil;

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM usage_events");
    }

    @Test
    void trackEndpoint_savesPageViewAndReferrer() throws Exception {
        mockMvc.perform(post("/api/nav").contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", BROWSER).header("X-Visitor-Id", A)
                .content("{\"page\": \"leaderboard\", \"referrer\": \"www.reddit.com\"}"))
            .andExpect(status().isNoContent());

        List<Map<String, Object>> rows = waitForRows(2);
        assertEquals(List.of("page_view:leaderboard", "referral:reddit.com"),
                rows.stream().map(r -> r.get("event") + ":" + r.get("detail")).sorted().toList());
        assertTrue(rows.stream().allMatch(r -> A.equals(r.get("visitor_id"))));
    }

    @Test
    void featureCall_isRecordedByTheInterceptor_butBotsAreNot() throws Exception {
        String feedback = "{\"type\": \"idea\", \"message\": \"Add an ARAM tab please\"}";
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "python-requests/2.31").content(feedback))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", BROWSER).header("X-Visitor-Id", B).content(feedback))
            .andExpect(status().isOk());

        List<Map<String, Object>> rows = waitForRows(1);
        assertEquals("feedback", rows.get(0).get("event"));
        assertEquals(B, rows.get(0).get("visitor_id"));
    }

    @Test
    void report_countsVisitorsAndFeatures_withoutAdmins() throws Exception {
        LocalDate today = metricsService.today();
        insert(A, null, "page_view", "home", today);
        insert(A, null, "player_view", "NA", today);
        insert(A, null, "page_view", "home", today.minusDays(3));
        insert(B, null, "page_view", "player", today);
        insert(B, null, "referral", "reddit.com", today);
        insert(C, null, "page_view", "leaderboard", today);
        insert(C, null, "page_view", "home", today.minusDays(20));
        // The admin's browser, logged in once and anonymous later: none of it counts
        insert(ADMIN_BROWSER, "metricsadmin", "login", null, today.minusDays(10));
        insert(ADMIN_BROWSER, null, "page_view", "home", today);

        MetricsReport report = metricsService.lastDays(7);

        assertEquals(new MetricsReport.Totals(3, 2, 2, 4, 1, 0), report.totals());
        assertEquals(7, report.daily().size());
        MetricsReport.Day last = report.daily().get(6);
        assertEquals(today, last.date());
        assertEquals(new MetricsReport.Day(today, 3, 1, 3, 1), last);
        assertEquals(List.of(new MetricsReport.Count("player_view", 1, 1)), report.features());
        assertEquals(List.of(new MetricsReport.Count("reddit.com", 1, 1)), report.referrers());
        assertEquals(new MetricsReport.Count("home", 2, 1), report.pages().get(0));
        assertTrue(report.recent().stream().noneMatch(r -> r.visitor().startsWith("dddddd")));

        mockMvc.perform(get("/api/admin/usage?days=7")
                .header("Authorization", "Bearer " + jwtUtil.generateToken("metricsadmin")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totals.visitors").value(3))
            .andExpect(jsonPath("$.daily.length()").value(7))
            .andExpect(jsonPath("$.zone").value("America/Denver"));
        mockMvc.perform(get("/api/admin/usage")
                .header("Authorization", "Bearer " + jwtUtil.generateToken("someoneelse")))
            .andExpect(status().isNotFound());
    }

    private void insert(String visitor, String username, String event, String detail, LocalDate day) {
        Timestamp at = Timestamp.from(day.atTime(LocalTime.NOON).atZone(metricsService.zone()).toInstant());
        jdbc.update("INSERT INTO usage_events (event, visitor_id, username, detail, created_at) VALUES (?, ?, ?, ?, ?)",
                event, visitor, username, detail, at);
    }

    /** Events are saved on a background thread; wait briefly for them. */
    private List<Map<String, Object>> waitForRows(int expected) throws InterruptedException {
        List<Map<String, Object>> rows = List.of();
        for (int i = 0; i < 50; i++) {
            rows = jdbc.queryForList("SELECT event, detail, visitor_id FROM usage_events");
            if (rows.size() >= expected) break;
            Thread.sleep(100);
        }
        Thread.sleep(200);
        rows = jdbc.queryForList("SELECT event, detail, visitor_id FROM usage_events");
        assertEquals(expected, rows.size(), "rows: " + rows);
        return rows;
    }
}
