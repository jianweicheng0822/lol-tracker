package com.jw.backend.entity;

import jakarta.persistence.*;

/**
 * JPA entity representing a single match from one player's perspective.
 * Persisted to the "match_records" table for historical trend analysis.
 *
 * Each row is unique per (puuid, matchId) pair — the same match is stored
 * once per player so champion stats and performance trends can be aggregated
 * without re-fetching from the Riot API.
 */
@Entity
@Table(name = "match_records", uniqueConstraints = @UniqueConstraint(columnNames = {"puuid", "matchId"}))
public class MatchRecord {

    // =====================================================
    // Primary Key — auto-generated unique ID
    // =====================================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // Composite natural key — identifies which player played which match
    // =====================================================
    @Column(nullable = false)
    private String puuid;       // Riot universal player identifier

    @Column(nullable = false)
    private String matchId;     // Riot match identifier (e.g., "NA1_1234567890")

    // =====================================================
    // Match context
    // =====================================================
    @Column(nullable = false)
    private String region;      // Region code (NA, EUW, KR, etc.)

    @Column(nullable = false)
    private String championName; // Champion played (e.g., "Ahri")

    // =====================================================
    // Performance stats — used for trend charts and champion aggregation
    // =====================================================
    private int kills;
    private int deaths;
    private int assists;
    private boolean win;
    private long gameDurationSec;          // Match length in seconds
    private long gameEndTimestamp;          // Epoch ms — used for chronological sorting
    private int queueId;                   // Queue type (420 = Ranked Solo, 440 = Flex, etc.)
    private int totalDamageDealtToChampions; // Damage to champions — for damage trend charts
    private int goldEarned;                // Gold earned — for economy trend charts
    private int totalMinionsKilled;        // Lane minions killed (CS)
    private int neutralMinionsKilled;      // Jungle monsters killed (combined with minions for total CS)
    private int placement;                 // Arena placement (1–8); 0 for standard modes
    private int teamTotalKills;            // Team's total kills — for kill participation calculation

    // Default constructor required by JPA
    public MatchRecord() {}

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPuuid() { return puuid; }
    public void setPuuid(String puuid) { this.puuid = puuid; }

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getChampionName() { return championName; }
    public void setChampionName(String championName) { this.championName = championName; }

    public int getKills() { return kills; }
    public void setKills(int kills) { this.kills = kills; }

    public int getDeaths() { return deaths; }
    public void setDeaths(int deaths) { this.deaths = deaths; }

    public int getAssists() { return assists; }
    public void setAssists(int assists) { this.assists = assists; }

    public boolean isWin() { return win; }
    public void setWin(boolean win) { this.win = win; }

    public long getGameDurationSec() { return gameDurationSec; }
    public void setGameDurationSec(long gameDurationSec) { this.gameDurationSec = gameDurationSec; }

    public long getGameEndTimestamp() { return gameEndTimestamp; }
    public void setGameEndTimestamp(long gameEndTimestamp) { this.gameEndTimestamp = gameEndTimestamp; }

    public int getQueueId() { return queueId; }
    public void setQueueId(int queueId) { this.queueId = queueId; }

    public int getTotalDamageDealtToChampions() { return totalDamageDealtToChampions; }
    public void setTotalDamageDealtToChampions(int totalDamageDealtToChampions) { this.totalDamageDealtToChampions = totalDamageDealtToChampions; }

    public int getGoldEarned() { return goldEarned; }
    public void setGoldEarned(int goldEarned) { this.goldEarned = goldEarned; }

    public int getTotalMinionsKilled() { return totalMinionsKilled; }
    public void setTotalMinionsKilled(int totalMinionsKilled) { this.totalMinionsKilled = totalMinionsKilled; }

    public int getNeutralMinionsKilled() { return neutralMinionsKilled; }
    public void setNeutralMinionsKilled(int neutralMinionsKilled) { this.neutralMinionsKilled = neutralMinionsKilled; }

    public int getPlacement() { return placement; }
    public void setPlacement(int placement) { this.placement = placement; }

    public int getTeamTotalKills() { return teamTotalKills; }
    public void setTeamTotalKills(int teamTotalKills) { this.teamTotalKills = teamTotalKills; }
}
