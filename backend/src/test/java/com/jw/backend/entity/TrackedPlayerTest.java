package com.jw.backend.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TrackedPlayerTest {

    @Test
    void defaultConstructor_initializesFieldsToDefaults() {
        TrackedPlayer player = new TrackedPlayer();
        assertNull(player.getId());
        assertNull(player.getPuuid());
        assertNull(player.getRegion());
        assertNull(player.getGameName());
        assertNull(player.getTagLine());
        assertEquals(0, player.getLastIngestedAt());
        assertEquals(0, player.getLastSearchedAt());
        assertEquals(0, player.getNextIngestAt());
        assertTrue(player.isEnabled());
    }

    @Test
    void gettersAndSetters_storeAndRetrieveValues() {
        TrackedPlayer player = new TrackedPlayer();
        player.setId(1L);
        player.setPuuid("test-puuid");
        player.setRegion("NA");
        player.setGameName("Faker");
        player.setTagLine("KR1");
        player.setLastIngestedAt(1000L);
        player.setLastSearchedAt(2000L);
        player.setNextIngestAt(3000L);
        player.setEnabled(false);

        assertEquals(1L, player.getId());
        assertEquals("test-puuid", player.getPuuid());
        assertEquals("NA", player.getRegion());
        assertEquals("Faker", player.getGameName());
        assertEquals("KR1", player.getTagLine());
        assertEquals(1000L, player.getLastIngestedAt());
        assertEquals(2000L, player.getLastSearchedAt());
        assertEquals(3000L, player.getNextIngestAt());
        assertFalse(player.isEnabled());
    }
}
