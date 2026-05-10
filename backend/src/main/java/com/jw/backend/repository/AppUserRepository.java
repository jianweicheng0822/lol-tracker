/**
 * @file AppUserRepository.java
 * @description Spring Data JPA repository for AppUser entity operations.
 * @module backend.repository
 */
package com.jw.backend.repository;

import com.jw.backend.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Provide CRUD and lookup operations for the app_users table.
 */
@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    /**
     * Find a user by their legacy session identifier.
     *
     * @param sessionId the session ID to search for
     * @return the matching user, if present
     */
    Optional<AppUser> findBySessionId(String sessionId);

    /**
     * Find a user by their username (used for authentication).
     *
     * @param username the username to search for
     * @return the matching user, if present
     */
    Optional<AppUser> findByUsername(String username);
}
