/**
 * @file JwtUtil.java
 * @description Utility class for JWT token generation, validation, and claim extraction.
 * @module backend.security
 */
package com.jw.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Handle JWT token lifecycle: generation, validation, and claim extraction.
 *
 * <p>Uses HMAC-SHA signing with a configurable secret and expiration duration.
 * The username is stored as the token subject claim.</p>
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    /**
     * Initialize the utility with signing key and expiration configuration.
     *
     * @param secret       the HMAC secret string (minimum 256 bits recommended)
     * @param expirationMs token expiration duration in milliseconds
     */
    public JwtUtil(@Value("${jwt.secret}") String secret,
                   @Value("${jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Generate a signed JWT token for the given username.
     *
     * @param username the username to embed as the token subject
     * @return compact serialized JWT string
     */
    public String generateToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Extract the username (subject claim) from a token.
     *
     * @param token the JWT token string
     * @return the username embedded in the token
     */
    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    /**
     * Validate a token's signature and expiration.
     *
     * @param token the JWT token string
     * @return true if the token is valid and not expired
     */
    public boolean isTokenValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Parse and verify the token, returning its claims payload.
     *
     * @param token the JWT token string
     * @return the parsed claims
     * @throws io.jsonwebtoken.JwtException if the token is invalid or expired
     */
    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
