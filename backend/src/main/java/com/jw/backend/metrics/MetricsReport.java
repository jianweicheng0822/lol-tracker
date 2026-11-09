package com.jw.backend.metrics;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Usage over a range of days, in the metrics time zone. Excludes the admins' own visits.
 *
 * <p>A <em>new</em> visitor's first ever event falls in the range. A <em>returning</em> one has
 * been on the site on at least two different days.</p>
 */
public record MetricsReport(
        String zone,
        LocalDate from,
        LocalDate to,
        Totals totals,
        List<Day> daily,
        List<Count> features,
        List<Count> pages,
        List<Count> referrers,
        List<Recent> recent) {

    public record Totals(long visitors, long newVisitors, long returningVisitors,
                         long pageViews, long actions, long signups) {
    }

    public record Day(LocalDate date, long visitors, long newVisitors, long pageViews, long actions) {
    }

    /** How many times something happened, and how many different visitors it was. */
    public record Count(String name, long count, long visitors) {
    }

    /** One event; the visitor id is shortened, just enough to tell visitors apart. */
    public record Recent(Instant at, String event, String detail, String visitor, String username) {
    }
}
