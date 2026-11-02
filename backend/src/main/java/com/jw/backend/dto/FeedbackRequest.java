package com.jw.backend.dto;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * What the feedback form sends.
 *
 * @param type     "bug", "idea" or "other"
 * @param message  the feedback itself
 * @param email    optional reply address
 * @param pageUrl  the page the form was opened on
 * @param website  honeypot: hidden from people, so only bots fill it in
 */
public record FeedbackRequest(String type, String message, String email, String pageUrl, String website) {

    public static final int MESSAGE_MIN = 5;
    public static final int MESSAGE_MAX = 1000;
    public static final int EMAIL_MAX = 254;
    public static final Set<String> TYPES = Set.of("bug", "idea", "other");

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    /** True when the hidden honeypot field was filled in, i.e. a bot sent this. */
    public boolean isBot() {
        return website != null && !website.isBlank();
    }

    /** Why the request can't be accepted, or null if it's fine. */
    public String validationError() {
        if (type == null || !TYPES.contains(type)) {
            return "Type must be bug, idea or other";
        }
        String text = message == null ? "" : message.strip();
        if (text.length() < MESSAGE_MIN) {
            return "Please write at least " + MESSAGE_MIN + " characters";
        }
        if (text.length() > MESSAGE_MAX) {
            return "Feedback can be at most " + MESSAGE_MAX + " characters";
        }
        if (email != null && !email.isBlank()) {
            String e = email.strip();
            if (e.length() > EMAIL_MAX || !EMAIL.matcher(e).matches()) {
                return "That email address doesn't look right";
            }
        }
        return null;
    }
}
