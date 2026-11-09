package com.jw.backend.metrics;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.Principal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.concurrent.Executor;
import java.util.regex.Pattern;

/**
 * Records what visitors do on the site (one row per page view or feature use) so the admin can
 * see whether real people use it and which features they use.
 *
 * <p>Rows are written on a background thread: tracking must never slow down or fail the request
 * it describes, so failures are only logged. Bots and scripts (by user agent) are skipped, and a
 * daily cap keeps a flood of requests from filling the table.</p>
 *
 * <p>A visitor is the random id the frontend keeps in localStorage and sends as
 * {@value #VISITOR_HEADER}. Without one (a browser redirect, a script) it's a hash of IP, user
 * agent and the date, so the raw IP is never stored and the id changes every day.</p>
 */
@Service
public class UsageEventService {

    private static final Logger log = LoggerFactory.getLogger(UsageEventService.class);

    public static final String VISITOR_HEADER = "X-Visitor-Id";
    static final Pattern VISITOR_ID = Pattern.compile("^[A-Za-z0-9-]{16,64}$");
    static final Pattern BOT_USER_AGENT = Pattern.compile(
            "bot|crawl|spider|slurp|curl|wget|python|java/|go-http|okhttp|headless|axios|node-fetch|"
                    + "httpclient|scrapy|lighthouse|facebookexternalhit|preview|monitor|uptime|postman",
            Pattern.CASE_INSENSITIVE);
    static final int DETAIL_MAX = 100;
    static final int USERNAME_MAX = 255;

    private final JdbcTemplate jdbc;
    private final Executor executor;
    private final String salt;
    private final int dailyLimit;
    private final int retentionDays;
    private final Clock clock;

    private LocalDate capDay;
    private int recordedToday;

    @Autowired
    public UsageEventService(JdbcTemplate jdbc,
                             @Qualifier("applicationTaskExecutor") TaskExecutor executor,
                             @Value("${jwt.secret}") String salt,
                             @Value("${metrics.daily-limit:20000}") int dailyLimit,
                             @Value("${metrics.retention-days:180}") int retentionDays) {
        this(jdbc, executor, salt, dailyLimit, retentionDays, Clock.systemUTC());
    }

    UsageEventService(JdbcTemplate jdbc, Executor executor, String salt, int dailyLimit,
                      int retentionDays, Clock clock) {
        this.jdbc = jdbc;
        this.executor = executor;
        this.salt = salt;
        this.dailyLimit = dailyLimit;
        this.retentionDays = retentionDays;
        this.clock = clock;
    }

    /** Record an event for whoever sent this request. Returns right away; never throws. */
    public void record(String event, String detail, HttpServletRequest request) {
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        if (isBot(userAgent)) return;
        Principal principal = request.getUserPrincipal();
        String username = principal != null ? principal.getName() : null;
        String visitor = visitorId(request.getHeader(VISITOR_HEADER), request.getRemoteAddr(), userAgent);
        record(event, detail, visitor, username);
    }

    void record(String event, String detail, String visitor, String username) {
        if (!takeFromDailyCap()) return;
        String safeDetail = truncate(detail, DETAIL_MAX);
        String safeUser = truncate(username, USERNAME_MAX);
        try {
            executor.execute(() -> insert(event, safeDetail, visitor, safeUser));
        } catch (RuntimeException e) {
            // Executor full or shutting down: losing one event is fine
            log.debug("Couldn't queue usage event: {}", e.getMessage());
        }
    }

    private void insert(String event, String detail, String visitor, String username) {
        try {
            jdbc.update("INSERT INTO usage_events (event, visitor_id, username, detail) VALUES (?, ?, ?, ?)",
                    event, visitor, username, detail);
        } catch (DataAccessException e) {
            log.warn("Couldn't save usage event {}: {}", event, e.getMessage());
        }
    }

    private synchronized boolean takeFromDailyCap() {
        LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        if (!today.equals(capDay)) {
            capDay = today;
            recordedToday = 0;
        }
        if (recordedToday >= dailyLimit) return false;
        recordedToday++;
        return true;
    }

    /** Drop events older than the retention window, once a day. */
    @Scheduled(cron = "0 30 3 * * *", zone = "UTC")
    public void purgeOld() {
        Timestamp cutoff = Timestamp.from(clock.instant().minus(Duration.ofDays(retentionDays)));
        try {
            int removed = jdbc.update("DELETE FROM usage_events WHERE created_at < ?", cutoff);
            if (removed > 0) log.info("Removed {} usage events older than {} days", removed, retentionDays);
        } catch (DataAccessException e) {
            log.warn("Couldn't purge old usage events: {}", e.getMessage());
        }
    }

    static boolean isBot(String userAgent) {
        return userAgent == null || userAgent.isBlank() || BOT_USER_AGENT.matcher(userAgent).find();
    }

    String visitorId(String header, String ip, String userAgent) {
        if (header != null && VISITOR_ID.matcher(header).matches()) {
            return header;
        }
        LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        return "ip-" + sha256(salt + "|" + today + "|" + ip + "|" + userAgent).substring(0, 24);
    }

    private static String sha256(String s) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String truncate(String s, int max) {
        if (s == null || s.isBlank()) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
