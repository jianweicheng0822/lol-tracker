package com.jw.backend;

import com.jw.backend.dto.AiChatRequest;
import com.jw.backend.dto.AiChatResponse;
import com.jw.backend.service.AiAnalyzeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * REST controller for AI-powered match analysis.
 *
 * Accepts structured match data + conversation history from the frontend,
 * delegates to AiAnalyzeService which constructs the prompt and calls OpenAI.
 * The API key never leaves the server — clients only see the analysis response.
 *
 * Two endpoints:
 *   POST /api/analyze        — synchronous, returns complete response
 *   POST /api/analyze/stream — SSE stream, returns tokens incrementally for real-time UI
 */
@RestController
@RequestMapping("/api/analyze")
public class AiAnalyzeController {

    private final AiAnalyzeService aiAnalyzeService;

    public AiAnalyzeController(AiAnalyzeService aiAnalyzeService) {
        this.aiAnalyzeService = aiAnalyzeService;
    }

    /** Synchronous analysis — waits for the full AI response before returning. */
    @PostMapping
    public ResponseEntity<AiChatResponse> analyze(@RequestBody AiChatRequest request) {
        if (request.matchData() == null || request.messages() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(aiAnalyzeService.analyze(request));
    }

    /** Streaming analysis — returns tokens via Server-Sent Events for responsive UI rendering. */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyzeStream(@RequestBody AiChatRequest request) {
        if (request.matchData() == null || request.messages() == null) {
            return Flux.just("[Error: matchData and messages are required]");
        }
        return aiAnalyzeService.analyzeStream(request);
    }
}
