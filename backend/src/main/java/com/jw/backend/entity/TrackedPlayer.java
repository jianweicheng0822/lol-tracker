package com.jw.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "tracked_players")
public class TrackedPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 78)
    private String puuid;

    @Column(nullable = false, length = 10)
    private String region;

    @Column(length = 100)
    private String gameName;

    @Column(length = 10)
    private String tagLine;

    @Column(nullable = false)
    private long lastIngestedAt;

    @Column(nullable = false)
    private long lastSearchedAt;

    @Column(nullable = false)
    private long nextIngestAt;

    @Column(nullable = false)
    private boolean enabled = true;

    public TrackedPlayer() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPuuid() { return puuid; }
    public void setPuuid(String puuid) { this.puuid = puuid; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getGameName() { return gameName; }
    public void setGameName(String gameName) { this.gameName = gameName; }

    public String getTagLine() { return tagLine; }
    public void setTagLine(String tagLine) { this.tagLine = tagLine; }

    public long getLastIngestedAt() { return lastIngestedAt; }
    public void setLastIngestedAt(long lastIngestedAt) { this.lastIngestedAt = lastIngestedAt; }

    public long getLastSearchedAt() { return lastSearchedAt; }
    public void setLastSearchedAt(long lastSearchedAt) { this.lastSearchedAt = lastSearchedAt; }

    public long getNextIngestAt() { return nextIngestAt; }
    public void setNextIngestAt(long nextIngestAt) { this.nextIngestAt = nextIngestAt; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
