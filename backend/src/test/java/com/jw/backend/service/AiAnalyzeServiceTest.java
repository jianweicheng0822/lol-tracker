/**
 * @file AiAnalyzeServiceTest.java
 * @description Unit tests for the AI analysis service internal methods.
 * @module backend.test
 */
package com.jw.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.AiChatRequest;
import com.jw.backend.dto.AiChatResponse;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Validate the {@link AiAnalyzeService} internal helper methods including OpenAI message
 * construction, streaming token extraction, and system prompt generation.
 */
class AiAnalyzeServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private AiAnalyzeService createService() {
        return new AiAnalyzeService("fake-api-key", objectMapper);
    }

    /** Verify that buildOpenAiMessages produces a system message and user messages. */
    @Test
    void buildOpenAiMessages_containsSystemAndUserMessages() throws Exception {
        AiAnalyzeService service = createService();

        AiChatRequest.MatchData matchData = new AiChatRequest.MatchData(
            "Ahri", "MID", "GOLD I", 10, 2, 8, 200, 15000, 20000, 30, 1800, true,
            List.of("Item1"), List.of("Lux", "Jinx"), List.of("Zed", "Yasuo")
        );
        AiChatRequest request = new AiChatRequest(
            matchData,
            List.of(new AiChatRequest.ChatMessage("user", "How did I do?"))
        );

        Method method = AiAnalyzeService.class.getDeclaredMethod("buildOpenAiMessages", AiChatRequest.class);
        method.setAccessible(true);

        @SuppressWarnings("unchecked")
        List<Map<String, String>> messages = (List<Map<String, String>>) method.invoke(service, request);

        assertEquals(2, messages.size());
        assertEquals("system", messages.get(0).get("role"));
        assertTrue(messages.get(0).get("content").contains("League of Legends"));
        assertTrue(messages.get(0).get("content").contains("Ahri"));
        assertEquals("user", messages.get(1).get("role"));
        assertEquals("How did I do?", messages.get(1).get("content"));
    }

    /** Verify that null messages result in only a system message being built. */
    @Test
    void buildOpenAiMessages_withNullMessages_onlyHasSystem() throws Exception {
        AiAnalyzeService service = createService();

        AiChatRequest.MatchData matchData = new AiChatRequest.MatchData(
            "Ahri", "MID", "GOLD I", 10, 2, 8, 200, 15000, 20000, 30, 1800, true,
            List.of(), List.of(), List.of()
        );
        AiChatRequest request = new AiChatRequest(matchData, null);

        Method method = AiAnalyzeService.class.getDeclaredMethod("buildOpenAiMessages", AiChatRequest.class);
        method.setAccessible(true);

        @SuppressWarnings("unchecked")
        List<Map<String, String>> messages = (List<Map<String, String>>) method.invoke(service, request);

        assertEquals(1, messages.size());
        assertEquals("system", messages.get(0).get("role"));
    }

    /** Verify that a valid streaming chunk yields the content token. */
    @Test
    void extractTokenFromChunk_withValidChunk_returnsContent() throws Exception {
        AiAnalyzeService service = createService();

        Method method = AiAnalyzeService.class.getDeclaredMethod("extractTokenFromChunk", String.class);
        method.setAccessible(true);

        String chunk = """
            {"choices":[{"delta":{"content":"Hello"}}]}
            """;

        String result = (String) method.invoke(service, chunk);
        assertEquals("Hello", result);
    }

    /** Verify that a chunk with no content field returns null. */
    @Test
    void extractTokenFromChunk_withMissingContent_returnsNull() throws Exception {
        AiAnalyzeService service = createService();

        Method method = AiAnalyzeService.class.getDeclaredMethod("extractTokenFromChunk", String.class);
        method.setAccessible(true);

        String chunk = """
            {"choices":[{"delta":{}}]}
            """;

        String result = (String) method.invoke(service, chunk);
        assertNull(result);
    }

    /** Verify that invalid JSON input returns null without throwing. */
    @Test
    void extractTokenFromChunk_withInvalidJson_returnsNull() throws Exception {
        AiAnalyzeService service = createService();

        Method method = AiAnalyzeService.class.getDeclaredMethod("extractTokenFromChunk", String.class);
        method.setAccessible(true);

        String result = (String) method.invoke(service, "not json");
        assertNull(result);
    }

    /** Verify that the system prompt contains the game context and champion name. */
    @Test
    void buildSystemPrompt_containsMatchData() throws Exception {
        AiAnalyzeService service = createService();

        AiChatRequest.MatchData matchData = new AiChatRequest.MatchData(
            "Zed", "MID", "PLATINUM II", 15, 1, 3, 250, 18000, 30000, 40, 2100, true,
            List.of("Duskblade"), List.of(), List.of()
        );

        Method method = AiAnalyzeService.class.getDeclaredMethod("buildSystemPrompt", AiChatRequest.MatchData.class);
        method.setAccessible(true);

        String prompt = (String) method.invoke(service, matchData);

        assertTrue(prompt.contains("League of Legends"));
        assertTrue(prompt.contains("Zed"));
    }
}
