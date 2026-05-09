package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionService {

    private final AppUserRepository appUserRepository;

    public SubscriptionService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public AppUser getOrCreateUser(String username) {
        if (username == null) {
            // Anonymous user — transient FREE-tier user (not persisted)
            return new AppUser();
        }
        return appUserRepository.findByUsername(username)
                .orElseGet(() -> {
                    AppUser user = new AppUser();
                    user.setUsername(username);
                    return appUserRepository.save(user);
                });
    }

    public void upgrade(String username) {
        AppUser user = getOrCreateUser(username);
        user.setTier(1);
        appUserRepository.save(user);
    }

    public int getMaxMatchCount(String username) {
        AppUser user = getOrCreateUser(username);
        return user.getTier() == 1 ? 100 : 20;
    }

    public boolean hasAiAccess(String username) {
        AppUser user = getOrCreateUser(username);
        return user.getTier() == 1;
    }
}
