/**
 * @file FavoritePlayerServiceTest.java
 * @description Unit tests for the favorite player service business logic.
 * @module backend.test
 */
package com.jw.backend.service;

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

    @BeforeEach
    void setUp() {
        service = new FavoritePlayerService(repository);
    }

    /** Verify that getAllFavorites returns the list from the repository. */
    @Test
    void getAllFavorites_returnsList() {
        FavoritePlayer fav = new FavoritePlayer("puuid", "Faker", "KR1", "KR");
        when(repository.findAll()).thenReturn(List.of(fav));

        List<FavoritePlayer> result = service.getAllFavorites();

        assertEquals(1, result.size());
        assertEquals("Faker", result.get(0).getGameName());
    }

    /** Verify that adding a new favorite saves and returns the entity. */
    @Test
    void addFavorite_whenNew_saveAndReturn() {
        when(repository.existsByPuuid("puuid")).thenReturn(false);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FavoritePlayer result = service.addFavorite("puuid", "Faker", "KR1", "KR");

        assertNotNull(result);
        assertEquals("Faker", result.getGameName());
        verify(repository).save(any());
    }

    /** Verify that adding an existing favorite returns null without saving. */
    @Test
    void addFavorite_whenExists_returnsNull() {
        when(repository.existsByPuuid("puuid")).thenReturn(true);

        FavoritePlayer result = service.addFavorite("puuid", "Faker", "KR1", "KR");

        assertNull(result);
        verify(repository, never()).save(any());
    }

    /** Verify that removing an existing favorite returns true and deletes it. */
    @Test
    void removeFavorite_whenExists_returnsTrue() {
        when(repository.existsByPuuid("puuid")).thenReturn(true);

        assertTrue(service.removeFavorite("puuid"));
        verify(repository).deleteByPuuid("puuid");
    }

    /** Verify that removing a non-existent favorite returns false without deleting. */
    @Test
    void removeFavorite_whenNotExists_returnsFalse() {
        when(repository.existsByPuuid("puuid")).thenReturn(false);

        assertFalse(service.removeFavorite("puuid"));
        verify(repository, never()).deleteByPuuid(any());
    }

    /** Verify that isFavorite returns true when the player exists. */
    @Test
    void isFavorite_whenExists_returnsTrue() {
        when(repository.existsByPuuid("puuid")).thenReturn(true);
        assertTrue(service.isFavorite("puuid"));
    }

    /** Verify that isFavorite returns false when the player does not exist. */
    @Test
    void isFavorite_whenNotExists_returnsFalse() {
        when(repository.existsByPuuid("puuid")).thenReturn(false);
        assertFalse(service.isFavorite("puuid"));
    }
}
