package com.jw.backend.service;

import com.jw.backend.entity.Feedback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executor;

/**
 * Emails new feedback to {@code feedback.notify-email} so it doesn't sit unread in the admin inbox.
 *
 * <p>Sending happens on a background thread: a slow or broken SMTP server must never hold up
 * or fail the visitor's submit, and the feedback is already saved by the time we get here.
 * Failures are only logged. With no notify address configured this does nothing.</p>
 */
@Component
public class FeedbackNotifier {

    private static final Logger log = LoggerFactory.getLogger(FeedbackNotifier.class);

    static final String SUBJECT_PREFIX = "[LoLTracker Feedback] ";
    static final int SUBJECT_SNIPPET_MAX = 50;

    private final JavaMailSender mailSender;
    private final Executor executor;
    private final String notifyEmail;
    private final String fromEmail;
    private final String inboxUrl;

    @Autowired
    public FeedbackNotifier(ObjectProvider<JavaMailSender> mailSender,
                            @Qualifier("applicationTaskExecutor") TaskExecutor executor,
                            @Value("${feedback.notify-email:}") String notifyEmail,
                            @Value("${spring.mail.username:}") String fromEmail,
                            @Value("${app.base-url:}") String baseUrl) {
        // No mail sender exists when spring.mail.host isn't set (e.g. in tests); then we just don't email
        this(mailSender.getIfAvailable(), (Executor) executor, notifyEmail, fromEmail, baseUrl);
    }

    FeedbackNotifier(JavaMailSender mailSender, Executor executor,
                     String notifyEmail, String fromEmail, String baseUrl) {
        this.mailSender = mailSender;
        this.executor = executor;
        this.notifyEmail = notifyEmail == null ? "" : notifyEmail.strip();
        this.fromEmail = fromEmail == null || fromEmail.isBlank() ? this.notifyEmail : fromEmail.strip();
        this.inboxUrl = (baseUrl == null ? "" : baseUrl.strip().replaceAll("/+$", "")) + "/admin/feedback";
    }

    public boolean isEnabled() {
        return mailSender != null && !notifyEmail.isEmpty();
    }

    /** Queue an email about this feedback. Returns right away; never throws. */
    public void notifyNew(Feedback feedback) {
        if (!isEnabled()) return;
        try {
            executor.execute(() -> send(feedback));
        } catch (RuntimeException e) {
            // Executor full or shutting down: losing the email is fine, the row is saved
            log.warn("Couldn't queue feedback email: {}", e.getMessage());
        }
    }

    private void send(Feedback feedback) {
        try {
            mailSender.send(buildMessage(feedback));
        } catch (MailException e) {
            log.warn("Couldn't email feedback notification: {}", e.getMessage());
        }
    }

    SimpleMailMessage buildMessage(Feedback feedback) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(notifyEmail);
        mail.setFrom(fromEmail);
        if (feedback.getEmail() != null) {
            // Hitting "Reply" in the inbox goes straight back to the visitor
            mail.setReplyTo(feedback.getEmail());
        }
        mail.setSubject(subject(feedback));
        mail.setText(body(feedback));
        return mail;
    }

    static String subject(Feedback feedback) {
        // Keep it on one line; the message is user input
        String oneLine = feedback.getMessage().replaceAll("\\s+", " ").strip();
        String snippet = oneLine.length() <= SUBJECT_SNIPPET_MAX
                ? oneLine
                : oneLine.substring(0, SUBJECT_SNIPPET_MAX) + "…";
        return SUBJECT_PREFIX + feedback.getType() + ": " + snippet;
    }

    String body(Feedback feedback) {
        return """
                Type: %s
                From: %s
                Reply to: %s
                Page: %s
                Sent: %s

                %s

                --
                Open the inbox: %s
                """.formatted(
                feedback.getType(),
                feedback.getUsername() == null ? "(not logged in)" : feedback.getUsername(),
                orDash(feedback.getEmail()),
                orDash(feedback.getPageUrl()),
                feedback.getCreatedAt(),
                feedback.getMessage(),
                inboxUrl);
    }

    private static String orDash(String s) {
        return s == null || s.isBlank() ? "-" : s;
    }
}
