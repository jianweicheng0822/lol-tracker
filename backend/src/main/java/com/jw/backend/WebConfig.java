package com.jw.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global CORS configuration.
 *
 * In development, the Vite dev server runs on localhost:5173 and needs CORS to reach
 * the Spring Boot backend on localhost:8080. In production, the frontend is served by
 * Spring Boot on the same origin so CORS headers are technically unnecessary, but we
 * keep the config active for flexibility (e.g., separate frontend deployments).
 *
 * The allowed origin is configurable via the CORS_ORIGIN environment variable,
 * defaulting to "http://localhost:5173" for local development.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origin:http://localhost:5173}")
    private String allowedOrigin;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigin)
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
