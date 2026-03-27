package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionService {

    private final AppUserRepository appUserRepository;

    public SubscriptionService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public AppUser getOrCreateUser(HttpSession session) {
        String sessionId = session.getId();
        return appUserRepository.findBySessionId(sessionId)
                .orElseGet(() -> appUserRepository.save(new AppUser(sessionId)));
    }

    public void upgrade(HttpSession session) {
        AppUser user = getOrCreateUser(session);
        user.setTier(1);
        appUserRepository.save(user);
    }

    public int getMaxMatchCount(HttpSession session) {
        AppUser user = getOrCreateUser(session);
        return user.getTier() == 1 ? 100 : 20;
    }

    public boolean hasAiAccess(HttpSession session) {
        AppUser user = getOrCreateUser(session);
        return user.getTier() == 1;
    }
}
