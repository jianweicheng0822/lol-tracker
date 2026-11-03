package com.jw.backend.service;

import com.jw.backend.entity.Feedback;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedbackNotifierTest {

    // Run the "background" send inline so the tests can check it
    private static final Executor INLINE = Runnable::run;

    @Mock
    private JavaMailSender mailSender;

    private FeedbackNotifier notifier(String notifyEmail) {
        return new FeedbackNotifier(mailSender, INLINE, notifyEmail, "sender@example.com", "https://example.com/");
    }

    private static Feedback feedback(String message, String email, String username) {
        return new Feedback("bug", message, email, username, "/player/abc", "UA/1");
    }

    @Test
    void notifyNew_noAddressConfigured_sendsNothing() {
        FeedbackNotifier off = notifier("  ");

        off.notifyNew(feedback("Broken page", null, null));

        assertFalse(off.isEnabled());
        verifyNoInteractions(mailSender);
    }

    @Test
    void notifyNew_noMailSender_sendsNothing() {
        FeedbackNotifier off = new FeedbackNotifier(null, INLINE, "inbox@example.com", "", "");

        assertFalse(off.isEnabled());
        assertDoesNotThrow(() -> off.notifyNew(feedback("Broken page", null, null)));
    }

    @Test
    void notifyNew_sendsToConfiguredAddress() {
        notifier("inbox@example.com").notifyNew(feedback("The match page is blank", "visitor@example.com", "alice"));

        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(sent.capture());
        SimpleMailMessage mail = sent.getValue();
        assertArrayEquals(new String[]{"inbox@example.com"}, mail.getTo());
        assertEquals("sender@example.com", mail.getFrom());
        assertEquals("visitor@example.com", mail.getReplyTo());
        assertEquals("[LoLTracker Feedback] bug: The match page is blank", mail.getSubject());
        assertTrue(mail.getText().contains("The match page is blank"));
        assertTrue(mail.getText().contains("From: alice"));
        assertTrue(mail.getText().contains("Page: /player/abc"));
        assertTrue(mail.getText().contains("https://example.com/admin/feedback"));
    }

    @Test
    void notifyNew_noVisitorEmail_leavesReplyToUnset() {
        notifier("inbox@example.com").notifyNew(feedback("Broken page", null, null));

        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(sent.capture());
        assertNull(sent.getValue().getReplyTo());
        assertTrue(sent.getValue().getText().contains("From: (not logged in)"));
        assertTrue(sent.getValue().getText().contains("Reply to: -"));
    }

    @Test
    void subject_longOrMultilineMessage_isOneShortLine() {
        String subject = FeedbackNotifier.subject(feedback("line one\r\nline two " + "x".repeat(100), null, null));

        assertFalse(subject.contains("\n"));
        assertFalse(subject.contains("\r"));
        assertTrue(subject.startsWith("[LoLTracker Feedback] bug: line one line two "));
        assertTrue(subject.endsWith("…"));
        assertEquals(FeedbackNotifier.SUBJECT_PREFIX.length() + "bug: ".length()
                + FeedbackNotifier.SUBJECT_SNIPPET_MAX + 1, subject.length());
    }

    @Test
    void notifyNew_smtpFailure_isSwallowed() {
        doThrow(new MailSendException("connection refused")).when(mailSender).send(any(SimpleMailMessage.class));

        assertDoesNotThrow(() -> notifier("inbox@example.com").notifyNew(feedback("Broken page", null, null)));
    }

    @Test
    void notifyNew_executorRejects_isSwallowed() {
        Executor full = task -> { throw new RejectedExecutionException("queue full"); };
        FeedbackNotifier n = new FeedbackNotifier(mailSender, full, "inbox@example.com", "", "");

        assertDoesNotThrow(() -> n.notifyNew(feedback("Broken page", null, null)));
        verifyNoInteractions(mailSender);
    }

    @Test
    void noSenderConfigured_fallsBackToNotifyAddress() {
        FeedbackNotifier n = new FeedbackNotifier(mailSender, INLINE, "inbox@example.com", "", "");

        assertEquals("inbox@example.com", n.buildMessage(feedback("Broken page", null, null)).getFrom());
    }
}
