package com.jw.backend.metrics;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Turns successful API calls into usage events: a player lookup, a match opened, an AI analysis,
 * a signup and so on. Calls that aren't a feature on their own (the other requests behind a
 * player page, admin pages) aren't recorded; page views come from {@link TrackController}.
 *
 * <p>The service is looked up lazily so controller slice tests, which pick up interceptors but
 * not services, don't need to provide one.</p>
 */
@Component
public class UsageTrackingInterceptor implements HandlerInterceptor {

    private final ObjectProvider<UsageEventService> usageEvents;

    public UsageTrackingInterceptor(ObjectProvider<UsageEventService> usageEvents) {
        this.usageEvents = usageEvents;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        if (ex != null) return;
        String event = eventFor(request.getMethod(), request.getRequestURI());
        if (event == null || !succeeded(event, response)) return;
        UsageEventService service = usageEvents.getIfAvailable();
        if (service != null) {
            service.record(event, detailFor(event, request), request);
        }
    }

    /** Which feature this call is, or null when it isn't one we count. */
    static String eventFor(String method, String path) {
        if (path == null) return null;
        if ("GET".equals(method)) {
            if (path.equals("/api/summoner") || path.equals("/api/summoner/by-puuid")) return "player_view";
            if (path.equals("/api/matches/full-detail")) return "match_detail";
            if (path.equals("/api/live-game")) return "live_game";
            if (path.equals("/api/leaderboard")) return "leaderboard";
            if (path.startsWith("/api/oauth2/") && path.endsWith("/callback")) return "login_oauth";
            return null;
        }
        if ("POST".equals(method)) {
            return switch (path) {
                case "/api/multi-search" -> "multi_search";
                case "/api/analyze", "/api/analyze/stream" -> "ai_analysis";
                case "/api/auth/register" -> "signup";
                case "/api/auth/login" -> "login";
                case "/api/favorites" -> "favorite_add";
                case "/api/checkout/session" -> "checkout_start";
                case "/api/feedback" -> "feedback";
                default -> null;
            };
        }
        return null;
    }

    static boolean succeeded(String event, HttpServletResponse response) {
        int status = response.getStatus();
        if ("login_oauth".equals(event)) {
            // Always a redirect; only the one carrying a token is a successful login
            String location = response.getHeader(HttpHeaders.LOCATION);
            return status == 302 && location != null && location.contains("token=");
        }
        return status >= 200 && status < 300;
    }

    static String detailFor(String event, HttpServletRequest request) {
        return switch (event) {
            case "player_view", "match_detail", "live_game", "leaderboard", "multi_search" ->
                    request.getParameter("region");
            case "login_oauth" -> {
                // /api/oauth2/{provider}/callback
                String[] parts = request.getRequestURI().split("/");
                yield parts.length > 3 ? parts[3] : null;
            }
            default -> null;
        };
    }
}
