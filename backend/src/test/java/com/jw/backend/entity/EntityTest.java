package com.jw.backend.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class EntityTest {

    // =====================================================
    // AppUser
    // =====================================================

    @Test
    void appUser_defaultConstructor() {
        AppUser user = new AppUser();
        assertNull(user.getId());
        assertNull(user.getSessionId());
    }

    @Test
    void appUser_gettersAndSetters() {
        AppUser user = new AppUser("session-1");
        user.setId(1L);
        user.setSessionId("session-2");
        user.setTier(1);

        assertEquals(1L, user.getId());
        assertEquals("session-2", user.getSessionId());
        assertEquals(1, user.getTier());
    }

    @Test
    void appUser_constructorSetsDefaultTier() {
        AppUser user = new AppUser("session-1");
        assertEquals(0, user.getTier());
        assertEquals("session-1", user.getSessionId());
    }

    // =====================================================
    // FavoritePlayer
    // =====================================================

    @Test
    void favoritePlayer_defaultConstructor() {
        FavoritePlayer fp = new FavoritePlayer();
        assertNull(fp.getId());
        assertNull(fp.getPuuid());
    }

    @Test
    void favoritePlayer_gettersAndSetters() {
        FavoritePlayer fp = new FavoritePlayer("puuid-1", "Faker", "KR1", "KR");
        fp.setId(1L);
        fp.setPuuid("puuid-2");
        fp.setGameName("Doublelift");
        fp.setTagLine("NA1");
        fp.setRegion("NA");
        LocalDateTime now = LocalDateTime.now();
        fp.setSavedAt(now);

        assertEquals(1L, fp.getId());
        assertEquals("puuid-2", fp.getPuuid());
        assertEquals("Doublelift", fp.getGameName());
        assertEquals("NA1", fp.getTagLine());
        assertEquals("NA", fp.getRegion());
        assertEquals(now, fp.getSavedAt());
    }

    @Test
    void favoritePlayer_constructorSetsSavedAt() {
        FavoritePlayer fp = new FavoritePlayer("puuid", "Faker", "KR1", "KR");
        assertNotNull(fp.getSavedAt());
    }

    // =====================================================
    // LpSnapshot
    // =====================================================

    @Test
    void lpSnapshot_defaultConstructor() {
        LpSnapshot snap = new LpSnapshot();
        assertNull(snap.getId());
        assertNull(snap.getPuuid());
    }

    @Test
    void lpSnapshot_gettersAndSetters() {
        LpSnapshot snap = new LpSnapshot("puuid", "RANKED_SOLO_5x5", "GOLD", "I", 75);
        snap.setId(1L);
        snap.setPuuid("puuid-2");
        snap.setQueueType("RANKED_FLEX_SR");
        snap.setTier("PLATINUM");
        snap.setRankDivision("IV");
        snap.setLeaguePoints(0);
        snap.setCapturedAt(1000L);

        assertEquals(1L, snap.getId());
        assertEquals("puuid-2", snap.getPuuid());
        assertEquals("RANKED_FLEX_SR", snap.getQueueType());
        assertEquals("PLATINUM", snap.getTier());
        assertEquals("IV", snap.getRankDivision());
        assertEquals(0, snap.getLeaguePoints());
        assertEquals(1000L, snap.getCapturedAt());
    }

    @Test
    void lpSnapshot_constructorSetsCapturedAt() {
        long before = System.currentTimeMillis();
        LpSnapshot snap = new LpSnapshot("puuid", "RANKED_SOLO_5x5", "GOLD", "I", 75);
        long after = System.currentTimeMillis();

        assertTrue(snap.getCapturedAt() >= before && snap.getCapturedAt() <= after);
    }

    // =====================================================
    // MatchRecord
    // =====================================================

    @Test
    void matchRecord_allGettersAndSetters() {
        MatchRecord r = new MatchRecord();
        r.setId(1L);
        r.setPuuid("puuid");
        r.setMatchId("NA1_123");
        r.setRegion("NA");
        r.setChampionName("Ahri");
        r.setKills(10);
        r.setDeaths(2);
        r.setAssists(8);
        r.setWin(true);
        r.setGameDurationSec(1800L);
        r.setGameEndTimestamp(1700000000000L);
        r.setQueueId(420);
        r.setTotalDamageDealtToChampions(25000);
        r.setGoldEarned(16000);
        r.setTotalMinionsKilled(200);
        r.setNeutralMinionsKilled(30);
        r.setPlacement(0);
        r.setTeamTotalKills(40);

        assertEquals(1L, r.getId());
        assertEquals("puuid", r.getPuuid());
        assertEquals("NA1_123", r.getMatchId());
        assertEquals("NA", r.getRegion());
        assertEquals("Ahri", r.getChampionName());
        assertEquals(10, r.getKills());
        assertEquals(2, r.getDeaths());
        assertEquals(8, r.getAssists());
        assertTrue(r.isWin());
        assertEquals(1800L, r.getGameDurationSec());
        assertEquals(1700000000000L, r.getGameEndTimestamp());
        assertEquals(420, r.getQueueId());
        assertEquals(25000, r.getTotalDamageDealtToChampions());
        assertEquals(16000, r.getGoldEarned());
        assertEquals(200, r.getTotalMinionsKilled());
        assertEquals(30, r.getNeutralMinionsKilled());
        assertEquals(0, r.getPlacement());
        assertEquals(40, r.getTeamTotalKills());
    }
}
