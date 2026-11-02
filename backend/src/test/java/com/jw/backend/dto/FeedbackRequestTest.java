package com.jw.backend.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FeedbackRequestTest {

    private static FeedbackRequest req(String type, String message, String email) {
        return new FeedbackRequest(type, message, email, "/", null);
    }

    @Test
    void valid_withAndWithoutEmail() {
        assertNull(req("bug", "Something broke", null).validationError());
        assertNull(req("idea", "Something to add", "").validationError());
        assertNull(req("other", "Hello there", "me@example.com").validationError());
    }

    @Test
    void unknownOrMissingType_rejected() {
        assertNotNull(req("spam", "Something broke", null).validationError());
        assertNotNull(req(null, "Something broke", null).validationError());
    }

    @Test
    void messageTooShortAfterTrimming_rejected() {
        assertNotNull(req("bug", "   hi    ", null).validationError());
        assertNotNull(req("bug", null, null).validationError());
    }

    @Test
    void messageLengthLimit() {
        assertNull(req("bug", "a".repeat(FeedbackRequest.MESSAGE_MAX), null).validationError());
        assertNotNull(req("bug", "a".repeat(FeedbackRequest.MESSAGE_MAX + 1), null).validationError());
    }

    @Test
    void badEmail_rejected() {
        assertNotNull(req("bug", "Something broke", "not-an-email").validationError());
        assertNotNull(req("bug", "Something broke", "a@b").validationError());
        assertNotNull(req("bug", "Something broke", "a".repeat(250) + "@x.com").validationError());
    }

    @Test
    void honeypot() {
        assertFalse(new FeedbackRequest("bug", "x", null, null, null).isBot());
        assertFalse(new FeedbackRequest("bug", "x", null, null, "  ").isBot());
        assertTrue(new FeedbackRequest("bug", "x", null, null, "http://spam").isBot());
    }
}
