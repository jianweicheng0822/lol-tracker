/**
 * @file LpSnapshot.java
 * @description JPA entity representing a point-in-time LP (League Points) snapshot.
 * @module backend.entity
 */
package com.jw.backend.entity;

import jakarta.persistence.*;

/**
 * Immutable snapshot of a player's ranked standing at a specific moment.
 *
 * <p>The capturedAt field uses epoch milliseconds to match Riot's timestamp format,
 * enabling consistent time-axis rendering alongside match timestamps.</p>
 */
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

    /** Default constructor for JPA. */
    public LpSnapshot() {}

    /**
     * Construct a new LP snapshot with the current system time.
     *
     * @param puuid        the player's unique identifier
     * @param queueType    the ranked queue (e.g., "RANKED_SOLO_5x5")
     * @param tier         the player's tier (e.g., "GOLD")
     * @param rankDivision the division within the tier (e.g., "II")
     * @param leaguePoints current LP within the division
     */
    public LpSnapshot(String puuid, String queueType, String tier, String rankDivision, int leaguePoints) {
        this.puuid = puuid;
        this.queueType = queueType;
        this.tier = tier;
        this.rankDivision = rankDivision;
        this.leaguePoints = leaguePoints;
        this.capturedAt = System.currentTimeMillis();
    }

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
