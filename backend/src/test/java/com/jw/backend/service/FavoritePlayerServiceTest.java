/**
 * @file FavoritePlayerServiceTest.java
 * @description Unit tests for the favorite player service business logic.
 * @module backend.test
 */
package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.repository.FavoritePlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Validate the {@link FavoritePlayerService} for listing, adding, removing, and
 * checking favorite players with mocked repository interactions.
 */
@ExtendWith(MockitoExtension.class)
class FavoritePlayerServiceTest {

    @Mock
    private FavoritePlayerRepository repository;

    private FavoritePlayerService service;
    private AppUser testUser;

    @BeforeEach
    void setUp() {
        service = new FavoritePlayerService(repository);
        testUser = new AppUser("testuser", "hash", true);
        testUser.setId(1L);
    }

    /** Verify that getAllFavorites returns the list from the repository. */
    @Test
    void getAllFavorites_returnsList() {
        FavoritePlayer fav = new FavoritePlayer("puuid", "Faker", "KR1", "KR");
        when(repository.findAllByUser(testUser)).thenReturn(List.of(fav));

        List<FavoritePlayer> result = service.getAllFavorites(testUser);

        assertEquals(1, result.size());
        assertEquals("Faker", result.get(0).getGameName());
    }

    /** Verify that adding a new favorite saves and returns the entity. */
    @Test
    void addFavorite_whenNew_saveAndReturn() {
        when(repository.existsByUserAndPuuid(testUser, "puuid")).thenReturn(false);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FavoritePlayer result = service.addFavorite(testUser, "puuid", "Faker", "KR1", "KR");

        assertNotNull(result);
        assertEquals("Faker", result.getGameName());
        assertEquals(testUser, result.getUser());
        verify(repository).save(any());
    }

    /** Verify that adding an existing favorite returns null without saving. */
    @Test
    void addFavorite_whenExists_returnsNull() {
        when(repository.existsByUserAndPuuid(testUser, "puuid")).thenReturn(true);

        FavoritePlayer result = service.addFavorite(testUser, "puuid", "Faker", "KR1", "KR");

        assertNull(result);
        verify(repository, never()).save(any());
    }

    /** Verify that removing an existing favorite returns true and deletes it. */
    @Test
    void removeFavorite_whenExists_returnsTrue() {
        when(repository.existsByUserAndPuuid(testUser, "puuid")).thenReturn(true);

        assertTrue(service.removeFavorite(testUser, "puuid"));
        verify(repository).deleteByUserAndPuuid(testUser, "puuid");
    }

    /** Verify that removing a non-existent favorite returns false without deleting. */
    @Test
    void removeFavorite_whenNotExists_returnsFalse() {
        when(repository.existsByUserAndPuuid(testUser, "puuid")).thenReturn(false);

        assertFalse(service.removeFavorite(testUser, "puuid"));
        verify(repository, never()).deleteByUserAndPuuid(any(), any());
    }

    /** Verify that isFavorite returns true when the player exists. */
    @Test
    void isFavorite_whenExists_returnsTrue() {
        when(repository.existsByUserAndPuuid(testUser, "puuid")).thenReturn(true);
        assertTrue(service.isFavorite(testUser, "puuid"));
    }

    /** Verify that isFavorite returns false when the player does not exist. */
    @Test
    void isFavorite_whenNotExists_returnsFalse() {
        when(repository.existsByUserAndPuuid(testUser, "puuid")).thenReturn(false);
        assertFalse(service.isFavorite(testUser, "puuid"));
    }
}
