/**
 * @file OpenApiConfig.java
 * @description Configuration for OpenAPI/Swagger documentation with JWT security scheme.
 * @module backend.config
 */
package com.jw.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Define the OpenAPI specification metadata and security scheme for Swagger UI.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Configure the OpenAPI document with application info and JWT bearer auth scheme.
     *
     * @return the configured OpenAPI specification bean
     */
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("LoL Tracker API")
                        .description("League of Legends analytics dashboard API with AI-powered match coaching")
                        .version("1.0.0"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT token obtained from /api/auth/login or /api/auth/register")));
    }
}
