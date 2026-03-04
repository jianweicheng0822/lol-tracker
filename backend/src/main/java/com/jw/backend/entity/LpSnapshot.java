package com.jw.backend.entity;

import jakarta.persistence.*;

/**
 * JPA entity representing a point-in-time snapshot of a player's LP (League Points).
 * Persisted to the "lp_snapshots" table for LP progression charts.
 *
 * A new snapshot is saved only when the player's rank/LP changes compared to the
 * most recent snapshot, avoiding duplicate entries for unchanged ranks.
 */
@Entity
@Table(name = "lp_snapshots")
public class LpSnapshot {

    // =====================================================
    // Primary Key
    // =====================================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // Player and queue identification
    // =====================================================
    @Column(nullable = false)
    private String puuid;       // Riot universal player identifier

    @Column(nullable = false)
    private String queueType;   // Queue type string (e.g., "RANKED_SOLO_5x5", "RANKED_FLEX_SR")

    // =====================================================
    // Rank data at the time of capture
    // =====================================================
    @Column(nullable = false)
    private String tier;         // Rank tier (e.g., "GOLD", "PLATINUM", "DIAMOND")

    @Column(nullable = false)
    private String rankDivision; // Division within tier (e.g., "I", "II", "III", "IV")

    private int leaguePoints;    // LP within the current division (0–100 for non-apex tiers)

    private long capturedAt;     // Epoch ms — when this snapshot was taken

    // Default constructor required by JPA
    public LpSnapshot() {}

    /** Creates a new snapshot with capturedAt set to the current time. */
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
