package com.jw.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** A username someone renamed away from, held for a while so nobody else can take it yet. */
@Entity
@Table(name = "released_usernames")
public class ReleasedUsername {

    @Id
    private String username;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "released_at", nullable = false)
    private Instant releasedAt;

    protected ReleasedUsername() {
    }

    public ReleasedUsername(String username, Long userId, Instant releasedAt) {
        this.username = username;
        this.userId = userId;
        this.releasedAt = releasedAt;
    }

    public String getUsername() { return username; }
    public Long getUserId() { return userId; }
    public Instant getReleasedAt() { return releasedAt; }
}
