package com.jw.backend;

import com.jw.backend.entity.FavoritePlayer;
import com.jw.backend.service.FavoritePlayerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for FavoriteController.
 * Tests all CRUD operations for favorite players.
 */
@WebMvcTest(FavoriteController.class)
class FavoriteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // Mock the service - we don't want to use a real database in tests
    @MockitoBean
    private FavoritePlayerService favoriteService;

    // =====================================================
    // GET /api/favorites - Get all favorites
    // =====================================================

    @Test
    void getAllFavorites_returnsListOfFavorites() throws Exception {
        // ARRANGE - Create fake favorites
        FavoritePlayer fav1 = new FavoritePlayer("puuid-1", "Faker", "KR1", "KR");
        fav1.setId(1L);
        FavoritePlayer fav2 = new FavoritePlayer("puuid-2", "Doublelift", "NA1", "NA");
        fav2.setId(2L);

        when(favoriteService.getAllFavorites()).thenReturn(List.of(fav1, fav2));

        // ACT & ASSERT
        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].gameName").value("Faker"))
            .andExpect(jsonPath("$[0].tagLine").value("KR1"))
            .andExpect(jsonPath("$[1].gameName").value("Doublelift"))
            .andExpect(jsonPath("$[1].tagLine").value("NA1"));
    }

    @Test
    void getAllFavorites_whenEmpty_returnsEmptyList() throws Exception {
        // ARRANGE
        when(favoriteService.getAllFavorites()).thenReturn(List.of());

        // ACT & ASSERT
        mockMvc.perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    // =====================================================
    // POST /api/favorites - Add a favorite
    // =====================================================

    @Test
    void addFavorite_withValidData_returnsCreatedFavorite() throws Exception {
        // ARRANGE
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

        // ACT & ASSERT
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.gameName").value("Faker"))
            .andExpect(jsonPath("$.tagLine").value("KR1"))
            .andExpect(jsonPath("$.region").value("KR"));
    }

    @Test
    void addFavorite_whenAlreadyExists_returnsBadRequest() throws Exception {
        // ARRANGE - Service returns null when player already exists
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

        // ACT & ASSERT
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Player is already in favorites"));
    }

    @Test
    void addFavorite_withMissingFields_returnsBadRequest() throws Exception {
        // ARRANGE - Missing gameName
        String requestBody = """
            {
                "puuid": "puuid-123",
                "tagLine": "KR1",
                "region": "KR"
            }
            """;

        // ACT & ASSERT
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());
    }

    // =====================================================
    // DELETE /api/favorites/{puuid} - Remove a favorite
    // =====================================================

    @Test
    void removeFavorite_whenExists_returnsOk() throws Exception {
        // ARRANGE
        when(favoriteService.removeFavorite("puuid-123")).thenReturn(true);

        // ACT & ASSERT
        mockMvc.perform(delete("/api/favorites/puuid-123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Removed from favorites"));

        // Verify service was called
        verify(favoriteService, times(1)).removeFavorite("puuid-123");
    }

    @Test
    void removeFavorite_whenNotFound_returnsNotFound() throws Exception {
        // ARRANGE
        when(favoriteService.removeFavorite("puuid-not-found")).thenReturn(false);

        // ACT & ASSERT
        mockMvc.perform(delete("/api/favorites/puuid-not-found"))
            .andExpect(status().isNotFound());
    }

    // =====================================================
    // GET /api/favorites/check/{puuid} - Check if favorite
    // =====================================================

    @Test
    void checkFavorite_whenIsFavorite_returnsTrue() throws Exception {
        // ARRANGE
        when(favoriteService.isFavorite("puuid-123")).thenReturn(true);

        // ACT & ASSERT
        mockMvc.perform(get("/api/favorites/check/puuid-123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(true));
    }

    @Test
    void checkFavorite_whenNotFavorite_returnsFalse() throws Exception {
        // ARRANGE
        when(favoriteService.isFavorite("puuid-456")).thenReturn(false);

        // ACT & ASSERT
        mockMvc.perform(get("/api/favorites/check/puuid-456"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isFavorite").value(false));
    }

    // =====================================================
    // Verify service interactions
    // =====================================================

    @Test
    void addFavorite_callsServiceWithCorrectParameters() throws Exception {
        // ARRANGE
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

        // ACT
        mockMvc.perform(post("/api/favorites")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestBody));

        // ASSERT - Verify service was called with correct params
        verify(favoriteService, times(1))
            .addFavorite("test-puuid", "TestPlayer", "TAG", "NA");
    }
}