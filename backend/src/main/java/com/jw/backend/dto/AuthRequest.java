/**
 * @file AuthRequest.java
 * @description DTO for authentication request payloads (login and registration).
 * @module backend.dto
 */
package com.jw.backend.dto;

/**
 * Credentials payload used by both login and registration endpoints.
 *
 * @param username the user's login name
 * @param password the user's plaintext password (hashed server-side before storage)
 */
public record AuthRequest(String username, String password) {
}
