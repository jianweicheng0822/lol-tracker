package com.jw.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "match_records", uniqueConstraints = @UniqueConstraint(columnNames = {"puuid", "matchId"}))
public class MatchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String puuid;

    @Column(nullable = false)
    private String matchId;

    @Column(nullable = false)
    private String region;

    @Column(nullable = false)
    private String championName;

    private int kills;
    private int deaths;
    private int assists;
    private boolean win;
    private long gameDurationSec;
    private long gameEndTimestamp;
    private int queueId;
    private int totalDamageDealtToChampions;
    private int goldEarned;
    private int totalMinionsKilled;
    private int neutralMinionsKilled;
    private int placement;
    private int teamTotalKills;

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
