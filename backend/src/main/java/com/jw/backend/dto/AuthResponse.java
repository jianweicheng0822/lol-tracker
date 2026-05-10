/**
 * @file AuthResponse.java
 * @description DTO for authentication response payloads containing JWT token and tier.
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Response payload returned after successful authentication.
 *
 * @param token signed JWT token for subsequent authenticated requests
 * @param tier  the user's subscription tier (0 = FREE, 1 = PRO)
 */
public record AuthResponse(String token, int tier) {
}
