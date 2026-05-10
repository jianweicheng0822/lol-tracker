/**
 * @file AiAnalyzeService.java
 * @description Service that integrates with the OpenAI API to provide AI-powered match analysis.
 * @module backend.service
 */
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
 * Orchestrate AI-powered match analysis by communicating with the OpenAI Chat Completions API.
 *
 * <p>Supports both synchronous single-response and streaming (SSE) modes. Match data
 * is injected into the system prompt to provide the LLM with full game context.</p>
 */
@Service
public class AiAnalyzeService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";
    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final int MAX_TOKENS = 1024;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    /**
     * Initialize the service with the OpenAI API key and JSON mapper.
     *
     * @param apiKey       OpenAI API key injected from application properties
     * @param objectMapper Jackson mapper for JSON serialization/deserialization
     */
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
     * Stream AI analysis tokens as they are generated for real-time display.
     *
     * <p>Uses OpenAI's streaming mode to emit partial responses. The "[DONE]" sentinel
     * from OpenAI is filtered out before tokens are forwarded to the client.</p>
     *
     * @param request the chat request containing match data and conversation history
     * @return reactive flux of text tokens; emits an error message on failure
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

    /**
     * Perform a synchronous (blocking) AI analysis and return the complete response.
     *
     * @param request the chat request containing match data and conversation history
     * @return structured response with the AI reply, model identifier, and token usage
     */
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

    /**
     * Extract the content token from a streaming SSE chunk.
     *
     * @param chunk raw JSON string from the OpenAI streaming response
     * @return the text content delta, or null if the chunk contains no content
     */
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
     * Build the OpenAI messages array with match context injected into the system prompt.
     *
     * @param request the chat request containing match data and user messages
     * @return ordered list of role/content message maps for the OpenAI API
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

    /**
     * Construct the system prompt that frames the AI as a League coaching assistant.
     *
     * <p>Match data is serialized as JSON and appended to the prompt so the model
     * has full game context for generating specific, actionable advice.</p>
     *
     * @param matchData structured match performance data to analyze
     * @return complete system prompt string
     */
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
