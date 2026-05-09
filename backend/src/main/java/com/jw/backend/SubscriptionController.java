package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.service.SubscriptionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/tier")
    public Map<String, Integer> getTier(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        AppUser user = subscriptionService.getOrCreateUser(username);
        return Map.of("tier", user.getTier());
    }

    @GetMapping("/upgrade")
    public Map<String, Integer> upgrade(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        subscriptionService.upgrade(username);
        return Map.of("tier", 1);
    }
}
