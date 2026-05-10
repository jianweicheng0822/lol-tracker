/**
 * @file AiChatResponse.java
 * @description DTO for synchronous AI analysis responses.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Response payload from the synchronous AI analysis endpoint.
 *
 * <p>The streaming variant is handled separately via Server-Sent Events.</p>
 *
 * @param reply      the AI-generated analysis text
 * @param model      the OpenAI model identifier used for generation
 * @param tokensUsed total token count consumed by the request
 */
public record AiChatResponse(String reply, String model, int tokensUsed) {}
