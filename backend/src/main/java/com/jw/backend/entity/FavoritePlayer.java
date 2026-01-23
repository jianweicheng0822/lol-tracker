package com.jw.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity class that maps to the "favorite_players" database table.
 * Each instance represents one saved favorite player.
 */
@Entity
@Table(name = "favorite_players")
public class FavoritePlayer {

    // =====================================================
    // Primary Key - auto-generated unique ID
    // =====================================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // Player Information
    // =====================================================
    @Column(nullable = false)
    private String puuid;

    @Column(nullable = false)
    private String gameName;

    @Column(nullable = false)
    private String tagLine;

    @Column(nullable = false)
    private String region;

    // =====================================================
    // Metadata
    // =====================================================
    @Column(nullable = false)
    private LocalDateTime savedAt;

    // =====================================================
    // Constructors
    // =====================================================

    // Default constructor (required by JPA)
    public FavoritePlayer() {
    }

    // Constructor for creating new favorites
    public FavoritePlayer(String puuid, String gameName, String tagLine, String region) {
        this.puuid = puuid;
        this.gameName = gameName;
        this.tagLine = tagLine;
        this.region = region;
        this.savedAt = LocalDateTime.now();
    }

    // =====================================================
    // Getters and Setters
    // =====================================================

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
