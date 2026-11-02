package com.jw.backend.service;

import com.jw.backend.dto.FeedbackDto;
import com.jw.backend.dto.FeedbackRequest;
import com.jw.backend.entity.Feedback;
import com.jw.backend.exception.RateLimitException;
import com.jw.backend.repository.FeedbackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository repository;

    private FeedbackService service;

    @BeforeEach
    void setUp() {
        service = new FeedbackService(repository, " boss , helper ,", 3);
    }

    @Test
    void isAdmin_matchesConfiguredUsernamesOnly() {
        assertTrue(service.isAdmin("boss"));
        assertTrue(service.isAdmin("helper"));
        assertFalse(service.isAdmin("alice"));
        assertFalse(service.isAdmin(""));
        assertFalse(service.isAdmin(null));
    }

    @Test
    void isAdmin_noneConfigured_nobodyIsAdmin() {
        FeedbackService none = new FeedbackService(repository, "", 3);
        assertFalse(none.isAdmin(""));
        assertFalse(none.isAdmin("boss"));
    }

    @Test
    void submit_trimsAndStoresFields() {
        when(repository.countByCreatedAtAfter(any())).thenReturn(0L);
        var request = new FeedbackRequest("idea", "  Add a dark mode  ", "  me@example.com ", "/leaderboard", null);

        service.submit(request, "alice", "UA/1");

        ArgumentCaptor<Feedback> saved = ArgumentCaptor.forClass(Feedback.class);
        verify(repository).save(saved.capture());
        assertEquals("idea", saved.getValue().getType());
        assertEquals("Add a dark mode", saved.getValue().getMessage());
        assertEquals("me@example.com", saved.getValue().getEmail());
        assertEquals("alice", saved.getValue().getUsername());
        assertEquals("/leaderboard", saved.getValue().getPageUrl());
        assertEquals("UA/1", saved.getValue().getUserAgent());
        assertFalse(saved.getValue().isResolved());
    }

    @Test
    void submit_blankEmail_storedAsNull() {
        when(repository.countByCreatedAtAfter(any())).thenReturn(0L);

        service.submit(new FeedbackRequest("bug", "Broken page", "   ", null, null), null, null);

        ArgumentCaptor<Feedback> saved = ArgumentCaptor.forClass(Feedback.class);
        verify(repository).save(saved.capture());
        assertNull(saved.getValue().getEmail());
        assertNull(saved.getValue().getPageUrl());
    }

    @Test
    void submit_longPageUrlAndUserAgent_areTruncated() {
        when(repository.countByCreatedAtAfter(any())).thenReturn(0L);

        service.submit(new FeedbackRequest("bug", "Broken page", null, "/" + "a".repeat(900), null),
                null, "U".repeat(900));

        ArgumentCaptor<Feedback> saved = ArgumentCaptor.forClass(Feedback.class);
        verify(repository).save(saved.capture());
        assertEquals(FeedbackService.PAGE_URL_MAX, saved.getValue().getPageUrl().length());
        assertEquals(FeedbackService.USER_AGENT_MAX, saved.getValue().getUserAgent().length());
    }

    @Test
    void submit_dailyCapReached_throwsAndSavesNothing() {
        when(repository.countByCreatedAtAfter(any())).thenReturn(3L);

        assertThrows(RateLimitException.class,
                () -> service.submit(new FeedbackRequest("bug", "Broken page", null, null, null), null, null));
        verify(repository, never()).save(any());
    }

    @Test
    void setResolved_updatesExistingEntry() {
        Feedback f = new Feedback("bug", "Broken page", null, null, "/", "UA");
        f.setId(5L);
        when(repository.findById(5L)).thenReturn(Optional.of(f));
        when(repository.save(f)).thenReturn(f);

        Optional<FeedbackDto> result = service.setResolved(5L, true);

        assertTrue(result.isPresent());
        assertTrue(result.get().resolved());
        assertTrue(f.isResolved());
    }

    @Test
    void setResolved_unknownId_returnsEmpty() {
        when(repository.findById(9L)).thenReturn(Optional.empty());

        assertTrue(service.setResolved(9L, true).isEmpty());
        verify(repository, never()).save(any());
    }
}
