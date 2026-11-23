package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.ReleasedUsername;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.repository.ReleasedUsernameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsernameServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T12:00:00Z");

    @Mock
    private AppUserRepository users;

    @Mock
    private ReleasedUsernameRepository released;

    private UsernameService service;

    @BeforeEach
    void setUp() {
        service = new UsernameService(users, released, " gtr-admin , other-admin ", Duration.ofHours(24),
            Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static AppUser user(long id, String name) {
        AppUser user = new AppUser(name, "hash", true);
        user.setId(id);
        return user;
    }

    // --- validation ---

    @Test
    void validation_requiresANameUpTo50CharactersAfterTrimming() {
        assertEquals(Optional.of("Username is required"), service.validationError(null));
        assertEquals(Optional.of("Username is required"), service.validationError("   "));
        assertEquals(Optional.of("Username must be 50 characters or fewer"), service.validationError("a".repeat(51)));
        assertEquals(Optional.empty(), service.validationError("  " + "a".repeat(50) + "  "));
        assertEquals(Optional.empty(), service.validationError("李明"));
    }

    // --- availability ---

    @Test
    void aFreeNameIsAvailable() {
        assertTrue(service.isAvailable("newname", null));
        assertTrue(service.isAvailable("newname", 7L));
    }

    @Test
    void aNameSomeoneElseHasIsNot_butYourOwnIs() {
        when(users.findByUsername("bob")).thenReturn(Optional.of(user(8L, "bob")));
        assertFalse(service.isAvailable("bob", null));
        assertFalse(service.isAvailable("bob", 7L));
        assertTrue(service.isAvailable("bob", 8L));
    }

    @Test
    void adminNamesAreNeverAvailable() {
        assertFalse(service.isAvailable("gtr-admin", null));
        assertFalse(service.isAvailable("other-admin", 7L));
        verifyNoInteractions(users);
    }

    @Test
    void aNameHeldAfterARenameIsOnlyAvailableToItsOldOwner() {
        when(released.findById("alice"))
            .thenReturn(Optional.of(new ReleasedUsername("alice", 7L, NOW.minus(Duration.ofHours(23)))));

        assertFalse(service.isAvailable("alice", null), "a new sign-up can't take it");
        assertFalse(service.isAvailable("alice", 8L), "another user can't rename to it");
        assertTrue(service.isAvailable("alice", 7L), "alice can take her old name back");
    }

    @Test
    void aHeldNameIsFreeAgainOnceEveryOldTokenHasExpired() {
        when(released.findById("alice"))
            .thenReturn(Optional.of(new ReleasedUsername("alice", 7L, NOW.minus(Duration.ofHours(25)))));

        assertTrue(service.isAvailable("alice", null));
        assertTrue(service.isAvailable("alice", 8L));
    }

    // --- renaming ---

    @Test
    void rename_movesToTheNewNameAndHoldsTheOldOne() {
        AppUser alice = user(7L, "alice");

        assertEquals(UsernameService.RenameResult.RENAMED, service.rename(alice, "  alice2 "));

        assertEquals("alice2", alice.getUsername());
        verify(users).saveAndFlush(alice);
        ArgumentCaptor<ReleasedUsername> held = ArgumentCaptor.forClass(ReleasedUsername.class);
        verify(released).save(held.capture());
        assertEquals("alice", held.getValue().getUsername());
        assertEquals(7L, held.getValue().getUserId());
        assertEquals(NOW, held.getValue().getReleasedAt());
    }

    @Test
    void rename_toTheSameName_changesNothing() {
        AppUser alice = user(7L, "alice");

        assertEquals(UsernameService.RenameResult.UNCHANGED, service.rename(alice, " alice "));
        verify(users, never()).saveAndFlush(any());
        verify(released, never()).save(any());
    }

    @Test
    void rename_toATakenName_isRefused() {
        AppUser alice = user(7L, "alice");
        when(users.findByUsername("bob")).thenReturn(Optional.of(user(8L, "bob")));

        assertEquals(UsernameService.RenameResult.TAKEN, service.rename(alice, "bob"));
        assertEquals("alice", alice.getUsername());
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void rename_ofAnAdmin_isRefused() {
        AppUser admin = user(1L, "gtr-admin");

        assertEquals(UsernameService.RenameResult.ADMIN_CANNOT_RENAME, service.rename(admin, "someone"));
        assertEquals("gtr-admin", admin.getUsername());
        verifyNoInteractions(released);
    }

    @Test
    void rename_backToYourOwnHeldName_releasesTheHold() {
        AppUser alice = user(7L, "alice2");
        ReleasedUsername hold = new ReleasedUsername("alice", 7L, NOW.minus(Duration.ofHours(1)));
        when(released.findById("alice")).thenReturn(Optional.of(hold));

        assertEquals(UsernameService.RenameResult.RENAMED, service.rename(alice, "alice"));

        assertEquals("alice", alice.getUsername());
        verify(released).delete(hold);
    }

    @Test
    void rename_losingARaceForTheName_throwsSoTheTransactionRollsBack() {
        AppUser alice = user(7L, "alice");
        when(users.saveAndFlush(alice)).thenThrow(new DataIntegrityViolationException("uq username"));

        assertThrows(UsernameService.UsernameTakenException.class, () -> service.rename(alice, "carol"));
    }
}
