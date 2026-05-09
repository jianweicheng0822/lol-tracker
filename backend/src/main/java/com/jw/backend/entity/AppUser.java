package com.jw.backend.entity;

import jakarta.persistence.*;

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

    @Column(nullable = false)
    private Integer tier = 0; // 0 = FREE, 1 = PRO

    public AppUser() {
    }

    public AppUser(String sessionId) {
        this.sessionId = sessionId;
        this.tier = 0;
    }

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
