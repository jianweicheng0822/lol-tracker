package com.jw.backend.repository;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.OAuthAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, Long> {

    Optional<OAuthAccount> findByProviderAndProviderId(String provider, String providerId);

    List<OAuthAccount> findAllByUser(AppUser user);
}
