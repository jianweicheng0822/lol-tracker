package com.jw.backend.service;

import com.jw.backend.entity.TrackedPlayer;
import com.jw.backend.repository.TrackedPlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlayerTrackingServiceTest {

    @Mock
    private TrackedPlayerRepository trackedPlayerRepository;

    private PlayerTrackingService service;

    @BeforeEach
    void setUp() {
        service = new PlayerTrackingService(trackedPlayerRepository);
    }

    @Test
    void trackPlayer_createsNewPlayerWhenNotExists() {
        when(trackedPlayerRepository.findByPuuid("new-puuid")).thenReturn(Optional.empty());
        when(trackedPlayerRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.trackPlayer("new-puuid", "NA", "NewPlayer", "NA1");

        ArgumentCaptor<TrackedPlayer> captor = ArgumentCaptor.forClass(TrackedPlayer.class);
        verify(trackedPlayerRepository).save(captor.capture());

        TrackedPlayer saved = captor.getValue();
        assertEquals("new-puuid", saved.getPuuid());
        assertEquals("NA", saved.getRegion());
        assertEquals("NewPlayer", saved.getGameName());
        assertEquals("NA1", saved.getTagLine());
        assertTrue(saved.getLastSearchedAt() > 0);
        assertTrue(saved.getNextIngestAt() > 0);
    }

    @Test
    void trackPlayer_updatesExistingPlayer() {
        TrackedPlayer existing = new TrackedPlayer();
        existing.setPuuid("existing-puuid");
        existing.setRegion("EUW");
        existing.setGameName("OldName");
        existing.setTagLine("EUW1");

        when(trackedPlayerRepository.findByPuuid("existing-puuid")).thenReturn(Optional.of(existing));
        when(trackedPlayerRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.trackPlayer("existing-puuid", "NA", "NewName", "NA1");

        verify(trackedPlayerRepository).save(existing);
        assertEquals("NA", existing.getRegion());
        assertEquals("NewName", existing.getGameName());
        assertEquals("NA1", existing.getTagLine());
    }

    @Test
    void trackPlayer_retriesOnConcurrentInsert() {
        when(trackedPlayerRepository.findByPuuid("race-puuid"))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(createPlayer("race-puuid")));

        when(trackedPlayerRepository.save(any()))
            .thenThrow(new DataIntegrityViolationException("Duplicate key"))
            .thenAnswer(i -> i.getArgument(0));

        service.trackPlayer("race-puuid", "NA", "RacePlayer", "NA1");

        verify(trackedPlayerRepository, times(2)).save(any());
    }

    private TrackedPlayer createPlayer(String puuid) {
        TrackedPlayer p = new TrackedPlayer();
        p.setPuuid(puuid);
        p.setRegion("NA");
        return p;
    }
}
