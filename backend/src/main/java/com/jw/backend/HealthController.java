package com.jw.backend;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
/** Simple health-check endpoint for monitoring. */
@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class HealthController {
    @GetMapping("/health")
    public String health() {
        return "ok";
    }
}
