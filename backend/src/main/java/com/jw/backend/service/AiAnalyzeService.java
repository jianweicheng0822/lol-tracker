package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.AiChatRequest;
import com.jw.backend.dto.AiChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Handles AI-powered match analysis by proxying requests to the OpenAI Chat Completions API.
 *
 * Architecture: Frontend → Backend → OpenAI
 * The API key is injected server-side via environment variable and never exposed to the client.
 * The backend constructs the system prompt from structured match data, so the frontend
 * only sends raw stats — no prompt engineering happens on the client.
 *
 * Supports both streaming (SSE via Flux) and synchronous responses.
 */
@Service
public class AiAnalyzeService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";
    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final int MAX_TOKENS = 1024;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public AiAnalyzeService(
            @Value("${openai.api-key}") String apiKey,
            ObjectMapper objectMapper
    ) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl(OPENAI_URL)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    /**
     * Streams AI analysis tokens back as a Flux for real-time rendering.
     * Uses OpenAI's streaming mode (stream: true) and parses SSE chunks
     * to extract individual content tokens from choices[0].delta.content.
     */
    public Flux<String> analyzeStream(AiChatRequest request) {
        Map<String, Object> body = Map.of(
                "model", MODEL,
                "messages", buildOpenAiMessages(request),
                "stream", true,
                "max_tokens", MAX_TOKENS
        );

        return webClient.post()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .timeout(TIMEOUT)
                .filter(line -> !line.equals("[DONE]"))
                .mapNotNull(this::extractTokenFromChunk)
                .onErrorResume(e -> Flux.just("[Error: Unable to generate analysis. Please try again.]"));
    }

    public AiChatResponse analyze(AiChatRequest request) {
        Map<String, Object> body = Map.of(
                "model", MODEL,
                "messages", buildOpenAiMessages(request),
                "max_tokens", MAX_TOKENS
        );

        String response = webClient.post()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(TIMEOUT)
                .block();

        try {
            JsonNode root = objectMapper.readTree(response);
            String reply = root.path("choices").path(0).path("message").path("content").asText();
            String model = root.path("model").asText();
            int tokens = root.path("usage").path("total_tokens").asInt();
            return new AiChatResponse(reply, model, tokens);
        } catch (Exception e) {
            return new AiChatResponse("Failed to parse AI response.", MODEL, 0);
        }
    }

    /** Extracts the content token from a single SSE JSON chunk, or null if no content is present. */
    private String extractTokenFromChunk(String chunk) {
        try {
            JsonNode delta = objectMapper.readTree(chunk)
                    .path("choices").path(0).path("delta").path("content");
            return (delta.isMissingNode() || delta.isNull()) ? null : delta.asText();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Builds the OpenAI message array: system prompt (with match data) + conversation history.
     * The system prompt is constructed server-side to keep prompt engineering off the client
     * and to prevent prompt injection via the frontend.
     */
    private List<Map<String, String>> buildOpenAiMessages(AiChatRequest request) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", buildSystemPrompt(request.matchData())));

        if (request.messages() != null) {
            for (AiChatRequest.ChatMessage msg : request.messages()) {
                messages.add(Map.of("role", msg.role(), "content", msg.content()));
            }
        }

        return messages;
    }

    /** Serializes match data into the system prompt so the AI has full game context. */
    private String buildSystemPrompt(AiChatRequest.MatchData matchData) {
        String matchJson;
        try {
            matchJson = objectMapper.writeValueAsString(matchData);
        } catch (Exception e) {
            matchJson = matchData.toString();
        }

        return """
                You are a League of Legends coaching assistant. Analyze the player's match performance \
                based on the data provided below. Be specific, actionable, and encouraging.

                When the user asks about their performance, cover these areas as relevant:
                - Overall performance evaluation
                - Strengths demonstrated in this game
                - Potential mistakes or areas for improvement
                - Build/item analysis
                - Macro/game sense observations (based on CS, vision, damage, gold efficiency)
                - One specific focus area for improvement

                Keep responses concise but insightful. Use League terminology naturally. \
                If the user asks follow-up questions, maintain context from the match data.

                Match data:
                """ + matchJson;
    }
}
