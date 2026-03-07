package com.jw.backend;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
/** Simple health-check endpoint for monitoring. */
@RestController
public class HealthController {
    @GetMapping("/health")
    public String health() {
        return "ok";
    }
}
