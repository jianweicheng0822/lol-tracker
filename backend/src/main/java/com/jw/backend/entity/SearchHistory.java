package com.jw.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "search_history")
public class SearchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(name = "game_name", nullable = false)
    private String gameName;

    @Column(name = "tag_line", nullable = false)
    private String tagLine;

    @Column(nullable = false)
    private String region;

    @Column(name = "searched_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private Instant searchedAt;

    public SearchHistory() {
    }

    public SearchHistory(String gameName, String tagLine, String region) {
        this.gameName = gameName;
        this.tagLine = tagLine;
        this.region = region;
        this.searchedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public String getGameName() { return gameName; }
    public void setGameName(String gameName) { this.gameName = gameName; }

    public String getTagLine() { return tagLine; }
    public void setTagLine(String tagLine) { this.tagLine = tagLine; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public Instant getSearchedAt() { return searchedAt; }
    public void setSearchedAt(Instant searchedAt) { this.searchedAt = searchedAt; }
}
