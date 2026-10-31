/**
 * @file AiChatRequest.java
 * @description DTO for AI analysis requests containing match context and conversation history.
 * @module backend.dto
 */
package com.jw.backend.dto;

import java.util.List;

/**
 * Request payload for AI match analysis endpoints.
 *
 * <p>Carries pre-extracted match context so the LLM receives structured data
 * rather than needing to parse raw Riot JSON.</p>
 *
 * @param matchData structured match performance data for the AI to analyze
 * @param messages  conversation history for multi-turn chat context
 */
public record AiChatRequest(
    MatchData matchData,
    List<ChatMessage> messages
) {
    /**
     * Pre-extracted match performance metrics.
     *
     * @param champion       the champion played
     * @param role           the assigned role/position
     * @param rank           the player's current ranked tier
     * @param kills          total kills
     * @param deaths         total deaths
     * @param assists        total assists
     * @param cs             creep score (minions killed)
     * @param gold           total gold earned
     * @param damage         total damage dealt to champions
     * @param visionScore    vision score for the game
     * @param gameDurationSec game length in seconds
     * @param win            whether the player won
     * @param items          list of item names purchased
     * @param teamComp       allied team champion names
     * @param enemyComp      enemy team champion names
     */
    public record MatchData(
        String champion, String role, String rank,
        int kills, int deaths, int assists,
        int cs, int gold, int damage, int visionScore,
        int gameDurationSec, boolean win,
        List<String> items,
        List<String> teamComp, List<String> enemyComp
    ) {}

    /**
     * Single message in the conversation history.
     *
     * @param role    the message sender role ("user" or "assistant")
     * @param content the message text
     */
    public record ChatMessage(String role, String content) {}

    // Every request is billed by OpenAI per token, so the size of what gets forwarded is capped.
    // The frontend sends at most the last 10 messages and caps typed input at 1000 characters.
    public static final int MAX_MESSAGES = 20;
    public static final int MAX_USER_CHARS = 1_000;
    public static final int MAX_ASSISTANT_CHARS = 8_000;
    public static final int MAX_TOTAL_CHARS = 60_000;
    public static final int MAX_FIELD_CHARS = 50;
    public static final int MAX_LIST_SIZE = 20;

    /**
     * Check the request against the size and role limits.
     *
     * @return a short error message, or null when the request is acceptable
     */
    public String validationError() {
        if (matchData == null || messages == null) return "matchData and messages are required";
        if (messages.isEmpty() || messages.size() > MAX_MESSAGES) {
            return "messages must contain 1 to " + MAX_MESSAGES + " entries";
        }
        int total = 0;
        for (ChatMessage msg : messages) {
            if (msg == null || msg.role() == null || msg.content() == null || msg.content().isBlank()) {
                return "each message needs a role and content";
            }
            // Only user/assistant: a client-supplied "system" message could override the coaching prompt
            int limit = switch (msg.role()) {
                case "user" -> MAX_USER_CHARS;
                case "assistant" -> MAX_ASSISTANT_CHARS;
                default -> -1;
            };
            if (limit < 0) return "message role must be user or assistant";
            if (msg.content().length() > limit) return "message is too long";
            total += msg.content().length();
        }
        if (total > MAX_TOTAL_CHARS) return "conversation is too long";
        if (!"user".equals(messages.get(messages.size() - 1).role())) {
            return "the last message must be from the user";
        }
        if (tooLong(matchData.champion()) || tooLong(matchData.role()) || tooLong(matchData.rank())
                || badList(matchData.items()) || badList(matchData.teamComp())
                || badList(matchData.enemyComp())) {
            return "matchData is invalid";
        }
        return null;
    }

    private static boolean tooLong(String s) {
        return s != null && s.length() > MAX_FIELD_CHARS;
    }

    private static boolean badList(List<String> list) {
        return list != null && (list.size() > MAX_LIST_SIZE
                || list.stream().anyMatch(AiChatRequest::tooLong));
    }
}
