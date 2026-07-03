package com.jw.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    private final SecurityConfig config = new SecurityConfig(
            mock(JwtAuthFilter.class), "http://localhost:5173");

    @Test
    void passwordEncoder_returnsBCrypt() {
        PasswordEncoder encoder = config.passwordEncoder();
        assertInstanceOf(BCryptPasswordEncoder.class, encoder);
    }

    @Test
    void passwordEncoder_encodesAndMatches() {
        PasswordEncoder encoder = config.passwordEncoder();
        String encoded = encoder.encode("testPassword");
        assertTrue(encoder.matches("testPassword", encoded));
        assertFalse(encoder.matches("wrongPassword", encoded));
    }

    @Test
    void corsConfigurationSource_allowsConfiguredOrigin() {
        CorsConfigurationSource source = config.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/test");
        CorsConfiguration cors = source.getCorsConfiguration(request);

        assertNotNull(cors);
        assertTrue(cors.getAllowedOrigins().contains("http://localhost:5173"));
        assertTrue(cors.getAllowedMethods().contains("GET"));
        assertTrue(cors.getAllowedMethods().contains("POST"));
        assertTrue(cors.getAllowedMethods().contains("DELETE"));
        assertTrue(cors.getAllowedHeaders().contains("Authorization"));
        assertTrue(cors.getAllowCredentials());
    }
}
