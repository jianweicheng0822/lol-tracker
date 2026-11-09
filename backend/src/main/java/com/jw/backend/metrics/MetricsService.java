package com.jw.backend.metrics;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds {@link MetricsReport}s from the usage_events table for the admin page and daily email.
 *
 * <p>Every visitor id an admin was ever logged in with is left out, including that browser's
 * visits while logged out, so testing the site doesn't count as real use.</p>
 */
@Service
public class MetricsService {

    public static final int MAX_DAYS = 90;
    static final int RECENT_LIMIT = 50;

    /** Not feature use: page views and where visitors came from are reported separately. */
    private static final String NOT_ACTION = "('page_view', 'referral')";

    /**
     * The events in the range, minus the admins'. {@code day} is the local date in the metrics
     * zone. {@code firsts} and {@code days_seen} are only computed by queries that use them.
     */
    private static final String BASE = """
            WITH admin_visitors AS (
                SELECT DISTINCT visitor_id FROM usage_events WHERE username IN (:admins)
            ),
            ev AS (
                SELECT e.event, e.visitor_id, e.username, e.detail, e.created_at,
                       (e.created_at AT TIME ZONE :zone)::date AS day
                FROM usage_events e
                WHERE e.created_at >= :start AND e.created_at < :end
                  AND e.visitor_id NOT IN (SELECT visitor_id FROM admin_visitors)
            ),
            firsts AS (
                SELECT visitor_id, MIN(created_at) AS first_at FROM usage_events
                WHERE visitor_id IN (SELECT visitor_id FROM ev) GROUP BY visitor_id
            ),
            days_seen AS (
                SELECT visitor_id, COUNT(DISTINCT (created_at AT TIME ZONE :zone)::date) AS n
                FROM usage_events
                WHERE created_at < :end AND visitor_id IN (SELECT visitor_id FROM ev)
                GROUP BY visitor_id
            )
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final List<String> admins;
    private final ZoneId zone;
    private final Clock clock;

    @Autowired
    public MetricsService(NamedParameterJdbcTemplate jdbc,
                          @Value("${admin.usernames:}") String adminUsernames,
                          @Value("${metrics.zone:America/Denver}") String zone) {
        this(jdbc, adminUsernames, ZoneId.of(zone), Clock.systemUTC());
    }

    MetricsService(NamedParameterJdbcTemplate jdbc, String adminUsernames, ZoneId zone, Clock clock) {
        this.jdbc = jdbc;
        List<String> parsed = Arrays.stream(adminUsernames.split(","))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .toList();
        // "IN ()" isn't valid SQL; a single space can't be a username
        this.admins = parsed.isEmpty() ? List.of(" ") : parsed;
        this.zone = zone;
        this.clock = clock;
    }

    public ZoneId zone() {
        return zone;
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    /** The last {@code days} days, today included. */
    public MetricsReport lastDays(int days) {
        int n = Math.max(1, Math.min(MAX_DAYS, days));
        LocalDate to = today();
        return report(to.minusDays(n - 1L), to);
    }

    /** From {@code from} through {@code to}, both included. */
    public MetricsReport report(LocalDate from, LocalDate to) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("admins", admins)
                .addValue("zone", zone.getId())
                .addValue("start", startOf(from))
                .addValue("end", startOf(to.plusDays(1)));

        MetricsReport.Totals totals = jdbc.queryForObject(BASE + """
                SELECT (SELECT COUNT(DISTINCT visitor_id) FROM ev) AS visitors,
                       (SELECT COUNT(*) FROM firsts WHERE first_at >= :start) AS new_visitors,
                       (SELECT COUNT(*) FROM days_seen WHERE n >= 2) AS returning_visitors,
                       (SELECT COUNT(*) FROM ev WHERE event = 'page_view') AS page_views,
                       (SELECT COUNT(*) FROM ev WHERE event NOT IN %s) AS actions,
                       (SELECT COUNT(*) FROM ev WHERE event = 'signup') AS signups
                """.formatted(NOT_ACTION), params, (rs, i) -> new MetricsReport.Totals(
                rs.getLong("visitors"), rs.getLong("new_visitors"), rs.getLong("returning_visitors"),
                rs.getLong("page_views"), rs.getLong("actions"), rs.getLong("signups")));

        Map<LocalDate, MetricsReport.Day> byDay = new HashMap<>();
        jdbc.query(BASE + """
                SELECT ev.day,
                       COUNT(DISTINCT ev.visitor_id) AS visitors,
                       COUNT(DISTINCT ev.visitor_id)
                           FILTER (WHERE (f.first_at AT TIME ZONE :zone)::date = ev.day) AS new_visitors,
                       COUNT(*) FILTER (WHERE ev.event = 'page_view') AS page_views,
                       COUNT(*) FILTER (WHERE ev.event NOT IN %s) AS actions
                FROM ev JOIN firsts f ON f.visitor_id = ev.visitor_id
                GROUP BY ev.day
                """.formatted(NOT_ACTION), params, rs -> {
            LocalDate day = rs.getDate("day").toLocalDate();
            byDay.put(day, new MetricsReport.Day(day, rs.getLong("visitors"), rs.getLong("new_visitors"),
                    rs.getLong("page_views"), rs.getLong("actions")));
        });
        List<MetricsReport.Day> daily = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            daily.add(byDay.getOrDefault(d, new MetricsReport.Day(d, 0, 0, 0, 0)));
        }

        List<MetricsReport.Count> features = counts(BASE + """
                SELECT event AS name, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS visitors
                FROM ev WHERE event NOT IN %s GROUP BY event ORDER BY n DESC, name
                """.formatted(NOT_ACTION), params);
        List<MetricsReport.Count> pages = counts(BASE + """
                SELECT COALESCE(detail, 'unknown') AS name, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS visitors
                FROM ev WHERE event = 'page_view' GROUP BY 1 ORDER BY n DESC, name
                """, params);
        List<MetricsReport.Count> referrers = counts(BASE + """
                SELECT detail AS name, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS visitors
                FROM ev WHERE event = 'referral' AND detail IS NOT NULL
                GROUP BY detail ORDER BY visitors DESC, n DESC, name LIMIT 20
                """, params);

        List<MetricsReport.Recent> recent = jdbc.query(BASE + """
                SELECT created_at, event, detail, visitor_id, username FROM ev
                ORDER BY created_at DESC LIMIT %d
                """.formatted(RECENT_LIMIT), params, (rs, i) -> new MetricsReport.Recent(
                rs.getTimestamp("created_at").toInstant(), rs.getString("event"), rs.getString("detail"),
                shortVisitor(rs.getString("visitor_id")), rs.getString("username")));

        return new MetricsReport(zone.getId(), from, to, totals, daily, features, pages, referrers, recent);
    }

    private List<MetricsReport.Count> counts(String sql, MapSqlParameterSource params) {
        return jdbc.query(sql, params, (rs, i) ->
                new MetricsReport.Count(rs.getString("name"), rs.getLong("n"), rs.getLong("visitors")));
    }

    private OffsetDateTime startOf(LocalDate day) {
        return day.atStartOfDay(zone).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
    }

    static String shortVisitor(String visitorId) {
        if (visitorId == null) return null;
        if (visitorId.startsWith("ip-")) return visitorId.substring(0, Math.min(9, visitorId.length()));
        return visitorId.substring(0, Math.min(6, visitorId.length()));
    }
}
