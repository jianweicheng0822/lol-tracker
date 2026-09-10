package com.jw.backend.service;

import com.jw.backend.dto.SearchHistoryResponse;
import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.SearchHistory;
import com.jw.backend.repository.SearchHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchHistoryServiceTest {

    @Mock
    private SearchHistoryRepository repository;

    private SearchHistoryService service;
    private AppUser testUser;
    private AppUser otherUser;

    @BeforeEach
    void setUp() {
        service = new SearchHistoryService(repository);
        testUser = new AppUser("testuser", "hash", true);
        testUser.setId(1L);
        otherUser = new AppUser("otheruser", "hash", true);
        otherUser.setId(2L);
    }

    @Test
    void getHistory_returnsResponseList() {
        SearchHistory h = new SearchHistory("Faker", "KR1", "KR");
        h.setUser(testUser);
        when(repository.findTop10ByUserOrderBySearchedAtDesc(testUser)).thenReturn(List.of(h));

        List<SearchHistoryResponse> result = service.getHistory(testUser);

        assertEquals(1, result.size());
        assertEquals("Faker", result.get(0).gameName());
        assertEquals("KR1", result.get(0).tagLine());
        assertEquals("KR", result.get(0).region());
    }

    @Test
    void addEntry_whenNew_savesNewRecord() {
        when(repository.findByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
            testUser, "Faker", "KR1", "KR")).thenReturn(Optional.empty());
        when(repository.countByUser(testUser)).thenReturn(1L);

        service.addEntry(testUser, "Faker", "KR1", "KR");

        ArgumentCaptor<SearchHistory> captor = ArgumentCaptor.forClass(SearchHistory.class);
        verify(repository).save(captor.capture());
        SearchHistory saved = captor.getValue();
        assertEquals("Faker", saved.getGameName());
        assertEquals("KR1", saved.getTagLine());
        assertEquals("KR", saved.getRegion());
        assertEquals(testUser, saved.getUser());
    }

    @Test
    void addEntry_whenExistsDifferentCase_updatesCasingAndTimestamp() {
        SearchHistory existing = new SearchHistory("faker", "kr1", "KR");
        existing.setUser(testUser);
        existing.setSearchedAt(Instant.now().minusSeconds(3600));

        when(repository.findByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
            testUser, "Faker", "KR1", "KR")).thenReturn(Optional.of(existing));

        service.addEntry(testUser, "Faker", "KR1", "KR");

        ArgumentCaptor<SearchHistory> captor = ArgumentCaptor.forClass(SearchHistory.class);
        verify(repository).save(captor.capture());
        SearchHistory saved = captor.getValue();
        assertEquals("Faker", saved.getGameName());
        assertEquals("KR1", saved.getTagLine());
        // Should not create a new record
        verify(repository, times(1)).save(any());
    }

    @Test
    void addEntry_whenOver10_deletesOldest() {
        when(repository.findByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
            testUser, "NewPlayer", "TAG", "NA")).thenReturn(Optional.empty());
        when(repository.countByUser(testUser)).thenReturn(11L);

        SearchHistory oldest = new SearchHistory("OldPlayer", "OLD", "NA");
        oldest.setId(1L);
        oldest.setUser(testUser);
        when(repository.findFirstByUserOrderBySearchedAtAsc(testUser)).thenReturn(Optional.of(oldest));

        service.addEntry(testUser, "NewPlayer", "TAG", "NA");

        verify(repository).save(any());
        verify(repository).delete(oldest);
    }

    @Test
    void addEntry_whenExactly10_doesNotDelete() {
        when(repository.findByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
            testUser, "NewPlayer", "TAG", "NA")).thenReturn(Optional.empty());
        when(repository.countByUser(testUser)).thenReturn(10L);

        service.addEntry(testUser, "NewPlayer", "TAG", "NA");

        verify(repository).save(any());
        verify(repository, never()).delete(any());
    }

    @Test
    void removeEntry_callsRepository() {
        service.removeEntry(testUser, "Faker", "KR1", "KR");

        verify(repository).deleteByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
            testUser, "Faker", "KR1", "KR");
    }

    @Test
    void clearHistory_callsRepository() {
        service.clearHistory(testUser);

        verify(repository).deleteAllByUser(testUser);
    }

    @Test
    void userIsolation_differentUsersDoNotInterfere() {
        when(repository.findByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
            testUser, "Faker", "KR1", "KR")).thenReturn(Optional.empty());
        when(repository.countByUser(testUser)).thenReturn(1L);

        service.addEntry(testUser, "Faker", "KR1", "KR");

        ArgumentCaptor<SearchHistory> captor = ArgumentCaptor.forClass(SearchHistory.class);
        verify(repository).save(captor.capture());
        assertEquals(testUser, captor.getValue().getUser());
        assertNotEquals(otherUser, captor.getValue().getUser());
    }
}
