package com.jw.backend.metrics;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Page views from the frontend. The single-page app changes pages without asking the server, so
 * it reports each page here, and on the first page of a visit where the visitor came from.
 * Always answers 204, whatever it's sent, so there's nothing to probe.
 *
 * <p>The path avoids words like "track", "metrics" or "analytics": ad blockers block requests
 * whose URL contains them, which would hide those visitors.</p>
 */
@RestController
public class TrackController {

    static final Pattern PAGE = Pattern.compile("^[a-z_]{1,30}$");
    static final Pattern HOST = Pattern.compile("^[a-z0-9.-]{1,100}$");

    public record TrackRequest(String page, String referrer) {
    }

    private final UsageEventService usageEvents;

    public TrackController(UsageEventService usageEvents) {
        this.usageEvents = usageEvents;
    }

    @PostMapping("/api/nav")
    public ResponseEntity<Void> track(@RequestBody(required = false) TrackRequest body, HttpServletRequest request) {
        if (body != null && body.page() != null && PAGE.matcher(body.page()).matches()) {
            usageEvents.record("page_view", body.page(), request);
            String host = referrerHost(body.referrer(), request.getServerName());
            if (host != null) {
                usageEvents.record("referral", host, request);
            }
        }
        return ResponseEntity.noContent().build();
    }

    /** The referring site's host without "www.", or null when it's missing, invalid or this site. */
    static String referrerHost(String referrer, String ownHost) {
        if (referrer == null) return null;
        String host = stripWww(referrer.strip().toLowerCase(Locale.ROOT));
        if (!HOST.matcher(host).matches()) return null;
        if (ownHost != null && host.equals(stripWww(ownHost.toLowerCase(Locale.ROOT)))) return null;
        return host;
    }

    private static String stripWww(String host) {
        return host.startsWith("www.") ? host.substring(4) : host;
    }
}
