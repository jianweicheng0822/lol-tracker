/**
 * @file HealthController.java
 * @description Simple health check endpoint for load balancer and deployment probes.
 * @module backend.controller
 */
package com.jw.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Expose a lightweight health check endpoint for infrastructure monitoring.
 *
 * <p>Used by AWS ALB target group health checks and Docker HEALTHCHECK directives
 * to confirm the application is running and accepting requests.</p>
 */
@RestController
public class HealthController {

    /**
     * Return a simple "ok" response indicating the service is healthy.
     *
     * @return the string "ok"
     */
    @GetMapping("/health")
    public String health() {
        return "ok";
    }
}
