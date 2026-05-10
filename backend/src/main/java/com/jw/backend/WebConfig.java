/**
 * @file WebConfig.java
 * @description Spring MVC configuration placeholder; CORS is managed in SecurityConfig.
 * @module backend.config
 */
package com.jw.backend;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC configuration bean.
 *
 * <p>Intentionally empty — CORS rules are co-located with authentication configuration
 * in {@link com.jw.backend.security.SecurityConfig} to keep access control centralized.</p>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
