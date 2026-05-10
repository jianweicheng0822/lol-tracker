/**
 * @file AiAnalyzeController.java
 * @description REST controller exposing AI-powered match analysis endpoints.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.dto.AiChatRequest;
import com.jw.backend.dto.AiChatResponse;
import com.jw.backend.service.AiAnalyzeService;
import com.jw.backend.service.SubscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.security.Principal;

/**
 * Provide AI-driven analysis of match data for PRO-tier subscribers.
 *
 * <p>Both synchronous and Server-Sent Event streaming endpoints are available.
 * Access is gated behind the subscription service to enforce tier restrictions.</p>
 */
@RestController
@RequestMapping("/api/analyze")
public class AiAnalyzeController {

    private final AiAnalyzeService aiAnalyzeService;
    private final SubscriptionService subscriptionService;

    /**
     * Construct the controller with required service dependencies.
     *
     * @param aiAnalyzeService    service responsible for AI inference logic
     * @param subscriptionService service that validates subscription tier access
     */
    public AiAnalyzeController(AiAnalyzeService aiAnalyzeService, SubscriptionService subscriptionService) {
        this.aiAnalyzeService = aiAnalyzeService;
        this.subscriptionService = subscriptionService;
    }

    /**
     * Perform a synchronous AI analysis of the provided match data and conversation context.
     *
     * @param request   contains match data and chat messages for contextual analysis
     * @param principal authenticated user principal; may be null for anonymous users
     * @return AI-generated analysis response, or 403 if the user lacks PRO access
     */
    @PostMapping
    public ResponseEntity<AiChatResponse> analyze(@RequestBody AiChatRequest request, Principal principal) {
        String username = principal != null ? principal.getName() : null;
        if (!subscriptionService.hasAiAccess(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (request.matchData() == null || request.messages() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(aiAnalyzeService.analyze(request));
    }

    /**
     * Stream AI analysis results as Server-Sent Events for real-time UI updates.
     *
     * <p>Returns error messages as plain text flux entries when access is denied
     * or request validation fails, since SSE streams cannot use HTTP status codes
     * after the connection is established.</p>
     *
     * @param request   contains match data and chat messages for contextual analysis
     * @param principal authenticated user principal; may be null for anonymous users
     * @return reactive stream of analysis text chunks
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyzeStream(@RequestBody AiChatRequest request, Principal principal) {
        String username = principal != null ? principal.getName() : null;
        if (!subscriptionService.hasAiAccess(username)) {
            return Flux.just("[Error: AI analysis requires PRO subscription]");
        }
        if (request.matchData() == null || request.messages() == null) {
            return Flux.just("[Error: matchData and messages are required]");
        }
        return aiAnalyzeService.analyzeStream(request);
    }
}
