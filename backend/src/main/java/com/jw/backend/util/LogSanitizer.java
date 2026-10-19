package com.jw.backend.util;

/**
 * Makes request-derived values safe to put in a log line.
 *
 * <p>Values such as a request path, a PUUID or a leaderboard parameter come from the client. If one
 * contained a line break it could start a forged log entry, so line breaks are replaced.</p>
 */
public final class LogSanitizer {

    private LogSanitizer() {
    }

    /** {@code value} as a single log-safe line ({@code "null"} for null). */
    public static String clean(Object value) {
        return String.valueOf(value).replaceAll("[\r\n]", "_");
    }
}
