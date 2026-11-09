package com.jw.backend.metrics;

import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MetricsDigestTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 7);

    private final MetricsService metrics = mock(MetricsService.class);
    private final JavaMailSender mail = mock(JavaMailSender.class);

    private static MetricsReport report(LocalDate from, LocalDate to, MetricsReport.Totals totals,
                                        List<MetricsReport.Day> daily, List<MetricsReport.Count> features) {
        return new MetricsReport("America/Denver", from, to, totals, daily, features,
                List.of(new MetricsReport.Count("home", 9, 5)),
                List.of(new MetricsReport.Count("reddit.com", 2, 2)), List.of());
    }

    private final MetricsReport day = report(DAY, DAY, new MetricsReport.Totals(5, 3, 2, 9, 4, 1),
            List.of(new MetricsReport.Day(DAY, 5, 3, 9, 4)),
            List.of(new MetricsReport.Count("player_view", 3, 3), new MetricsReport.Count("ai_analysis", 1, 1)));
    private final MetricsReport week = report(DAY.minusDays(7), DAY.minusDays(1), new MetricsReport.Totals(0, 0, 0, 0, 0, 0),
            List.of(new MetricsReport.Day(DAY.minusDays(2), 2, 2, 4, 0), new MetricsReport.Day(DAY.minusDays(1), 4, 1, 6, 2)),
            List.of());

    @Test
    void message_summarizesTheDay() {
        MetricsDigest digest = new MetricsDigest(metrics, mail, "me@example.com", "", "https://loltracker.lol/");
        SimpleMailMessage msg = digest.buildMessage(day, week);

        assertArrayEquals(new String[]{"me@example.com"}, msg.getTo());
        assertEquals("me@example.com", msg.getFrom());
        assertEquals("[LoLTracker Daily] Sat Nov 7: 5 visitors, 3 new", msg.getSubject());
        String body = msg.getText();
        assertTrue(body.contains("Visitors:   5  (3 new, 2 returning)"), body);
        assertTrue(body.contains("7-day avg:  3.0 visitors/day"), body);
        assertTrue(body.contains("Signups:    1"), body);
        assertTrue(body.contains("player_view          3  (3 visitors)"), body);
        assertTrue(body.contains("ai_analysis          1  (1 visitor)"), body);
        assertTrue(body.contains("reddit.com"), body);
        assertTrue(body.contains("https://loltracker.lol/admin/usage"), body);
    }

    @Test
    void sendDaily_reportsYesterday() {
        when(metrics.today()).thenReturn(DAY.plusDays(1));
        when(metrics.report(DAY, DAY)).thenReturn(day);
        when(metrics.report(DAY.minusDays(7), DAY.minusDays(1))).thenReturn(week);

        new MetricsDigest(metrics, mail, "me@example.com", "bot@example.com", "").sendDaily();

        verify(mail).send(any(SimpleMailMessage.class));
    }

    @Test
    void disabledWithoutRecipientOrMailer() {
        new MetricsDigest(metrics, mail, "", "", "").sendDaily();
        new MetricsDigest(metrics, (JavaMailSender) null, "me@example.com", "", "").sendDaily();
        verifyNoInteractions(mail, metrics);
    }
}
