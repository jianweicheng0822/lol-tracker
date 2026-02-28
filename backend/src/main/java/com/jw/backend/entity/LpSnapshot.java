package com.jw.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "lp_snapshots")
public class LpSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String puuid;

    @Column(nullable = false)
    private String queueType;

    @Column(nullable = false)
    private String tier;

    @Column(nullable = false)
    private String rankDivision;

    private int leaguePoints;

    private long capturedAt;

    public LpSnapshot() {}

    public LpSnapshot(String puuid, String queueType, String tier, String rankDivision, int leaguePoints) {
        this.puuid = puuid;
        this.queueType = queueType;
        this.tier = tier;
        this.rankDivision = rankDivision;
        this.leaguePoints = leaguePoints;
        this.capturedAt = System.currentTimeMillis();
    }

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPuuid() { return puuid; }
    public void setPuuid(String puuid) { this.puuid = puuid; }

    public String getQueueType() { return queueType; }
    public void setQueueType(String queueType) { this.queueType = queueType; }

    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }

    public String getRankDivision() { return rankDivision; }
    public void setRankDivision(String rankDivision) { this.rankDivision = rankDivision; }

    public int getLeaguePoints() { return leaguePoints; }
    public void setLeaguePoints(int leaguePoints) { this.leaguePoints = leaguePoints; }

    public long getCapturedAt() { return capturedAt; }
    public void setCapturedAt(long capturedAt) { this.capturedAt = capturedAt; }
}
