package com.jw.backend.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** A bug report, idea or other note a visitor sent from the site's feedback form. */
@Entity
@Table(name = "feedback")
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** "bug", "idea" or "other". */
    @Column(nullable = false, length = 10)
    private String type;

    @Column(nullable = false, length = 1000)
    private String message;

    /** Optional, only if the visitor wants a reply. */
    @Column(length = 254)
    private String email;

    /** Set when the visitor was logged in. */
    private String username;

    /** The page the form was opened on, to help reproduce bugs. */
    @Column(name = "page_url", length = 500)
    private String pageUrl;

    @Column(name = "user_agent", length = 300)
    private String userAgent;

    @Column(nullable = false)
    private boolean resolved = false;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant createdAt = Instant.now();

    public Feedback() {
    }

    public Feedback(String type, String message, String email, String username, String pageUrl, String userAgent) {
        this.type = type;
        this.message = message;
        this.email = email;
        this.username = username;
        this.pageUrl = pageUrl;
        this.userAgent = userAgent;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getType() { return type; }
    public String getMessage() { return message; }
    public String getEmail() { return email; }
    public String getUsername() { return username; }
    public String getPageUrl() { return pageUrl; }
    public String getUserAgent() { return userAgent; }

    public boolean isResolved() { return resolved; }
    public void setResolved(boolean resolved) { this.resolved = resolved; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
