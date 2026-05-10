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
}
