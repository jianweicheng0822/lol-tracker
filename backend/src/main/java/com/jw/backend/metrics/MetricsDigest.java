package com.jw.backend.metrics;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Emails yesterday's usage every morning: how many people came, how many were new, what they
 * used and where they came from, next to the previous week's average.
 *
 * <p>Goes to {@code metrics.digest-email} (the feedback address by default) through the same
 * SMTP settings as the feedback emails. Does nothing when either is missing.</p>
 */
@Component
public class MetricsDigest {

    private static final Logger log = LoggerFactory.getLogger(MetricsDigest.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE MMM d", Locale.US);
    static final String SUBJECT_PREFIX = "[LoLTracker Daily] ";

    private final MetricsService metricsService;
    private final JavaMailSender mailSender;
    private final String toEmail;
    private final String fromEmail;
    private final String dashboardUrl;

    @Autowired
    public MetricsDigest(MetricsService metricsService,
                         ObjectProvider<JavaMailSender> mailSender,
                         @Value("${metrics.digest-email:}") String toEmail,
                         @Value("${spring.mail.username:}") String fromEmail,
                         @Value("${app.base-url:}") String baseUrl) {
        this(metricsService, mailSender.getIfAvailable(), toEmail, fromEmail, baseUrl);
    }

    MetricsDigest(MetricsService metricsService, JavaMailSender mailSender,
                  String toEmail, String fromEmail, String baseUrl) {
        this.metricsService = metricsService;
        this.mailSender = mailSender;
        this.toEmail = toEmail == null ? "" : toEmail.strip();
        this.fromEmail = fromEmail == null || fromEmail.isBlank() ? this.toEmail : fromEmail.strip();
        this.dashboardUrl = (baseUrl == null ? "" : baseUrl.strip().replaceAll("/+$", "")) + "/admin/metrics";
    }

    public boolean isEnabled() {
        return mailSender != null && !toEmail.isEmpty();
    }

    @Scheduled(cron = "${metrics.digest.cron:0 0 8 * * *}", zone = "${metrics.zone:America/Denver}")
    public void sendDaily() {
        if (!isEnabled()) return;
        try {
            LocalDate yesterday = metricsService.today().minusDays(1);
            MetricsReport day = metricsService.report(yesterday, yesterday);
            MetricsReport week = metricsService.report(yesterday.minusDays(7), yesterday.minusDays(1));
            mailSender.send(buildMessage(day, week));
        } catch (MailException | DataAccessException e) {
            log.warn("Couldn't send the daily metrics email: {}", e.getMessage());
        }
    }

    SimpleMailMessage buildMessage(MetricsReport day, MetricsReport week) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(toEmail);
        mail.setFrom(fromEmail);
        mail.setSubject(subject(day));
        mail.setText(body(day, week));
        return mail;
    }

    static String subject(MetricsReport day) {
        MetricsReport.Totals t = day.totals();
        return SUBJECT_PREFIX + DAY.format(day.from()) + ": " + plural(t.visitors(), "visitor")
                + ", " + t.newVisitors() + " new";
    }

    String body(MetricsReport day, MetricsReport week) {
        MetricsReport.Totals t = day.totals();
        double weekAvg = week.daily().stream().mapToLong(MetricsReport.Day::visitors).average().orElse(0);
        StringBuilder sb = new StringBuilder();
        sb.append("LoLTracker, ").append(DAY.format(day.from())).append(" (").append(day.zone()).append(")\n\n");
        sb.append("Visitors:   ").append(t.visitors())
                .append("  (").append(t.newVisitors()).append(" new, ")
                .append(t.returningVisitors()).append(" returning)\n");
        sb.append("7-day avg:  ").append(String.format(Locale.US, "%.1f", weekAvg)).append(" visitors/day\n");
        sb.append("Page views: ").append(t.pageViews()).append('\n');
        sb.append("Signups:    ").append(t.signups()).append('\n');

        section(sb, "What they did", day.features());
        section(sb, "Pages", day.pages());
        section(sb, "Came from", day.referrers());

        if (t.visitors() == 0) {
            sb.append("\nNo one outside the admin accounts used the site.\n");
        }
        sb.append("\n--\nFull dashboard: ").append(dashboardUrl).append('\n');
        return sb.toString();
    }

    private static void section(StringBuilder sb, String title, List<MetricsReport.Count> rows) {
        if (rows.isEmpty()) return;
        sb.append('\n').append(title).append(":\n");
        for (MetricsReport.Count c : rows) {
            sb.append(String.format(Locale.US, "  %-16s %5d  (%s)\n",
                    c.name(), c.count(), plural(c.visitors(), "visitor")));
        }
    }

    private static String plural(long n, String word) {
        return n + " " + word + (n == 1 ? "" : "s");
    }
}
