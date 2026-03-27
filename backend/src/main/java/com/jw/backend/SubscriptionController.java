package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.service.SubscriptionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/tier")
    public Map<String, Integer> getTier(HttpSession session) {
        AppUser user = subscriptionService.getOrCreateUser(session);
        return Map.of("tier", user.getTier());
    }

    @GetMapping("/upgrade")
    public Map<String, Integer> upgrade(HttpSession session) {
        subscriptionService.upgrade(session);
        return Map.of("tier", 1);
    }
}
