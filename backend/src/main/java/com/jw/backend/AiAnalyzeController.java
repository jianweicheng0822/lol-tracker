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

@RestController
@RequestMapping("/api/analyze")
public class AiAnalyzeController {

    private final AiAnalyzeService aiAnalyzeService;
    private final SubscriptionService subscriptionService;

    public AiAnalyzeController(AiAnalyzeService aiAnalyzeService, SubscriptionService subscriptionService) {
        this.aiAnalyzeService = aiAnalyzeService;
        this.subscriptionService = subscriptionService;
    }

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
