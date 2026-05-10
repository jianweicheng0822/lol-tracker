/**
 * @file SecurityConfig.java
 * @description Spring Security configuration with JWT authentication and CORS settings.
 * @module backend.security
 */
package com.jw.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configure Spring Security for stateless JWT-based authentication.
 *
 * <p>All endpoints are publicly accessible (permitAll) with optional JWT authentication.
 * The JWT filter populates the SecurityContext when a valid token is present, enabling
 * controllers to access the authenticated principal for subscription tier enforcement.
 * CORS is configured here alongside auth to keep access control centralized.</p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final String allowedOrigin;

    /**
     * Construct the configuration with required dependencies.
     *
     * @param jwtAuthFilter  the JWT authentication filter
     * @param allowedOrigin  CORS allowed origin from properties (defaults to localhost:5173)
     */
    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          @Value("${cors.allowed-origin:http://localhost:5173}") String allowedOrigin) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.allowedOrigin = allowedOrigin;
    }

    /**
     * Define the security filter chain with stateless session management and JWT filter.
     *
     * @param http the HttpSecurity builder
     * @return the configured security filter chain
     * @throws Exception if configuration fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configure CORS to allow requests from the frontend origin.
     *
     * @return the CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigin));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Provide a BCrypt password encoder for credential hashing.
     *
     * @return BCrypt password encoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
