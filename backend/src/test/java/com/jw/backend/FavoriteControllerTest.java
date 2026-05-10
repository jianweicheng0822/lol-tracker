/**
 * @file FavoriteControllerTest.java
 * @description Unit tests for the favorite players controller CRUD endpoints.
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.FavoritePlayerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the {@link FavoriteController} for listing, adding, removing, and
 * checking favorite players, including error handling for duplicates and missing fields.
 */
@WebMvcTest(FavoriteController.class)
@AutoConfigureMockMvc(addFilters = false)
class FavoriteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private FavoritePlayerService favoriteService;

    /** Verify that GET /api/favorites returns all saved favorites. */
    @Test
    void getAllFavorites_returnsListOfFavorites() throws Exception {
        FavoritePlayer fav1 = new FavoritePlayer("puuid-1", "Faker", "KR1", "KR");
        fav1.setId(1L);
        FavoritePlayer fav2 = new FavoritePlayer("puuid-2", "Doublelift", "NA1", "NA");
        fav2.setId(2L);

        when(favoriteService.getAllFavorites()).thenReturn(List.of(fav1, fav2));

        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].gameName").value("Faker"))
            .andExpect(jsonPath("$[0].tagLine").value("KR1"))
            .andExpect(jsonPath("$[1].gameName").value("Doublelift"))
            .andExpect(jsonPath("$[1].tagLine").value("NA1"));
    }

    /** Verify that GET /api/favorites returns an empty list when no favorites exist. */
    @Test
    void getAllFavorites_whenEmpty_returnsEmptyList() throws Exception {
        when(favoriteService.getAllFavorites()).thenReturn(List.of());

        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    /** Verify that POST /api/favorites with valid data returns the created favorite. */
    @Test
    void addFavorite_withValidData_returnsCreatedFavorite() throws Exception {
        FavoritePlayer saved = new FavoritePlayer("puuid-123", "Faker", "KR1", "KR");
        saved.setId(1L);

        when(favoriteService.addFavorite("puuid-123", "Faker", "KR1", "KR"))
            .thenReturn(saved);

        String requestBody = """
            {
                "puuid": "puuid-123",
                "gameName": "Faker",
                "tagLine": "KR1",
                "region": "KR"
            }
            """;

        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.gameName").value("Faker"))
            .andExpect(jsonPath("$.tagLine").value("KR1"))
            .andExpect(jsonPath("$.region").value("KR"));
    }

    /** Verify that adding a duplicate favorite returns HTTP 400 with an error message. */
    @Test
    void addFavorite_whenAlreadyExists_returnsBadRequest() throws Exception {
        when(favoriteService.addFavorite(anyString(), anyString(), anyString(), anyString()))
            .thenReturn(null);

        String requestBody = """
            {
                "puuid": "puuid-123",
                "gameName": "Faker",
                "tagLine": "KR1",
                "region": "KR"
            }
            """;

        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Player is already in favorites"));
    }

    /** Verify that adding a favorite with missing required fields returns HTTP 400. */
    @Test
    void addFavorite_withMissingFields_returnsBadRequest() throws Exception {
        String requestBody = """
            {
                "puuid": "puuid-123",
                "tagLine": "KR1",
                "region": "KR"
            }
            """;

        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());
    }

    /** Verify that deleting an existing favorite returns HTTP 200. */
    @Test
    void removeFavorite_whenExists_returnsOk() throws Exception {
        when(favoriteService.removeFavorite("puuid-123")).thenReturn(true);

        mockMvc.perform(delete("/api/favorites/puuid-123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Removed from favorites"));

        verify(favoriteService, times(1)).removeFavorite("puuid-123");
    }

    /** Verify that deleting a non-existent favorite returns HTTP 404. */
    @Test
    void removeFavorite_whenNotFound_returnsNotFound() throws Exception {
        when(favoriteService.removeFavorite("puuid-not-found")).thenReturn(false);

        mockMvc.perform(delete("/api/favorites/puuid-not-found"))
            .andExpect(status().isNotFound());
    }

    /** Verify that checking a favorited player returns isFavorite true. */
    @Test
    void checkFavorite_whenIsFavorite_returnsTrue() throws Exception {
        when(favoriteService.isFavorite("puuid-123")).thenReturn(true);

        mockMvc.perform(get("/api/favorites/check/puuid-123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(true));
    }

    /** Verify that checking a non-favorited player returns isFavorite false. */
    @Test
    void checkFavorite_whenNotFavorite_returnsFalse() throws Exception {
        when(favoriteService.isFavorite("puuid-456")).thenReturn(false);

        mockMvc.perform(get("/api/favorites/check/puuid-456"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(false));
    }

    /** Verify that the service is invoked with the exact parameters from the request body. */
    @Test
    void addFavorite_callsServiceWithCorrectParameters() throws Exception {
        FavoritePlayer saved = new FavoritePlayer("test-puuid", "TestPlayer", "TAG", "NA");
        saved.setId(1L);
        when(favoriteService.addFavorite(anyString(), anyString(), anyString(), anyString()))
            .thenReturn(saved);

        String requestBody = """
            {
                "puuid": "test-puuid",
                "gameName": "TestPlayer",
                "tagLine": "TAG",
                "region": "NA"
            }
            """;

        mockMvc.perform(post("/api/favorites")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody));

        verify(favoriteService, times(1))
            .addFavorite("test-puuid",   "TestPlayer", "TAG", "NA");
    }
}
