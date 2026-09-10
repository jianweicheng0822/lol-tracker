package com.jw.backend;

import com.jw.backend.dto.SearchHistoryResponse;
import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.SearchHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SearchHistoryController.class)
@AutoConfigureMockMvc(addFilters = false)
class SearchHistoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private SearchHistoryService searchHistoryService;

    @MockitoBean
    private AppUserRepository appUserRepository;

    private AppUser testUser;

    @BeforeEach
    void setUp() {
        testUser = new AppUser("testuser", "hash", true);
        testUser.setId(1L);
        when(appUserRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
    }

    @Test
    void getHistory_whenUnauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/search-history"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getHistory_returnsListOfEntries() throws Exception {
        List<SearchHistoryResponse> history = List.of(
            new SearchHistoryResponse("Faker", "KR1", "KR", Instant.now()),
            new SearchHistoryResponse("Doublelift", "NA1", "NA", Instant.now())
        );
        when(searchHistoryService.getHistory(testUser)).thenReturn(history);

        mockMvc.perform(get("/api/search-history")
                .principal(() -> "testuser"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].gameName").value("Faker"))
            .andExpect(jsonPath("$[1].gameName").value("Doublelift"));
    }

    @Test
    void addEntry_withMissingFields_returns400() throws Exception {
        String requestBody = """
            {
                "gameName": "Faker"
            }
            """;

        mockMvc.perform(post("/api/search-history")
                .principal(() -> "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void addEntry_withValidData_returns200() throws Exception {
        String requestBody = """
            {
                "gameName": "Faker",
                "tagLine": "KR1",
                "region": "KR"
            }
            """;

        mockMvc.perform(post("/api/search-history")
                .principal(() -> "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Search history updated"));

        verify(searchHistoryService, times(1)).addEntry(testUser, "Faker", "KR1", "KR");
    }

    @Test
    void removeEntry_callsServiceAndReturns200() throws Exception {
        String requestBody = """
            {
                "gameName": "Faker",
                "tagLine": "KR1",
                "region": "KR"
            }
            """;

        mockMvc.perform(delete("/api/search-history")
                .principal(() -> "testuser")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Entry removed"));

        verify(searchHistoryService, times(1)).removeEntry(testUser, "Faker", "KR1", "KR");
    }

    @Test
    void clearHistory_callsServiceAndReturns200() throws Exception {
        mockMvc.perform(delete("/api/search-history/all")
                .principal(() -> "testuser"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Search history cleared"));

        verify(searchHistoryService, times(1)).clearHistory(testUser);
    }
}
