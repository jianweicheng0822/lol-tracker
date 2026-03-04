package com.jw.backend.dto;

import java.util.List;

/**
 * Request payload for AI match analysis.
 *
 * The frontend sends structured match stats (not a pre-built prompt) so the backend
 * retains full control over prompt construction — preventing prompt injection and
 * keeping the system prompt confidential from the client.
 *
 * Conversation history (messages) enables multi-turn follow-up questions within
 * the same modal session.
 */
public record AiChatRequest(
    MatchData matchData,
    List<ChatMessage> messages
) {
    /** Structured match performance data extracted from MatchSummary on the frontend. */
    public record MatchData(
        String champion, String role, String rank,
        int kills, int deaths, int assists,
        int cs, int gold, int damage, int visionScore,
        int gameDurationSec, boolean win,
        List<String> items,
        List<String> teamComp, List<String> enemyComp
    ) {}

    /** Single message in the conversation (role: "user" or "assistant"). */
    public record ChatMessage(String role, String content) {}
}
