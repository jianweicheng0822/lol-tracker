/**
 * @file AppUser.java
 * @description JPA entity representing an application user with subscription tier.
 * @module backend.entity
 */
package com.jw.backend.entity;

import jakarta.persistence.*;

/**
 * Persistent user entity storing authentication credentials and subscription state.
 *
 * <p>The tier field maps to feature gates: 0 = FREE, 1 = PRO.
 * Anonymous users are represented by transient (non-persisted) instances.</p>
 */
@Entity
@Table(name = "app_users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String sessionId;

    @Column(unique = true)
    private String username;

    private String password;

    /** Subscription tier: 0 = FREE, 1 = PRO. Maps to feature gates in SubscriptionService. */
    @Column(nullable = false)
    private Integer tier = 0;

    /** Default constructor for JPA and transient anonymous user instances. */
    public AppUser() {
    }

    /**
     * Construct a session-based anonymous user.
     *
     * @param sessionId unique session identifier
     */
    public AppUser(String sessionId) {
        this.sessionId = sessionId;
        this.tier = 0;
    }

    /**
     * Construct an authenticated user with credentials.
     *
     * @param username the user's login name
     * @param password BCrypt-hashed password
     * @param isAuth   flag distinguishing this constructor from the session-based one
     */
    public AppUser(String username, String password, boolean isAuth) {
        this.username = username;
        this.password = password;
        this.tier = 0;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Integer getTier() {
        return tier;
    }

    public void setTier(Integer tier) {
        this.tier = tier;
    }
}
