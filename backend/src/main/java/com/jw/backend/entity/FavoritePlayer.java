/**
 * @file FavoritePlayer.java
 * @description JPA entity representing a player saved to the user's favorites list.
 * @module backend.entity
 */
package com.jw.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Persistent entity for a favorited player, keyed by PUUID for stability across name changes.
 */
@Entity
@Table(name = "favorite_players")
public class FavoritePlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String puuid;

    @Column(nullable = false)
    private String gameName;

    @Column(nullable = false)
    private String tagLine;

    @Column(nullable = false)
    private String region;

    @Column(nullable = false)
    private LocalDateTime savedAt;

    /** Default constructor for JPA. */
    public FavoritePlayer() {
    }

    /**
     * Construct a new favorite player entry with the current timestamp.
     *
     * @param puuid    the player's globally unique identifier
     * @param gameName the player's display name
     * @param tagLine  the player's tag line
     * @param region   the Riot platform region
     */
    public FavoritePlayer(String puuid, String gameName, String tagLine, String region) {
        this.puuid = puuid;
        this.gameName = gameName;
        this.tagLine = tagLine;
        this.region = region;
        this.savedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPuuid() {
        return puuid;
    }

    public void setPuuid(String puuid) {
        this.puuid = puuid;
    }

    public String getGameName() {
        return gameName;
    }

    public void setGameName(String gameName) {
        this.gameName = gameName;
    }

    public String getTagLine() {
        return tagLine;
    }

    public void setTagLine(String tagLine) {
        this.tagLine = tagLine;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public LocalDateTime getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(LocalDateTime savedAt) {
        this.savedAt = savedAt;
    }
}
