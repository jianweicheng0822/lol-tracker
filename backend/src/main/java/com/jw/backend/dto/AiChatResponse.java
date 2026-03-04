package com.jw.backend.dto;

/** Response from the synchronous /api/analyze endpoint (non-streaming). */
public record AiChatResponse(String reply, String model, int tokensUsed) {}
