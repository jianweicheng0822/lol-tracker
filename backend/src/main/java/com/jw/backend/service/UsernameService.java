package com.jw.backend.service;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.ReleasedUsername;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.repository.ReleasedUsernameRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Who may use which username: shared by sign-up, Google/Discord sign-up and renaming.
 *
 * <p>Login tokens identify the user only by username and stay valid for {@code jwt.expiration-ms}.
 * So after a rename the old name is held for that long (only its old owner may take it back),
 * otherwise someone could take it while the old owner's tokens still log in as that name. Names in
 * {@code admin.usernames} are never available, because admin rights go by username.
 */
@Service
public class UsernameService {

    public static final int MAX_LENGTH = 50;

    /** Why a rename didn't happen. */
    public enum RenameResult { RENAMED, UNCHANGED, TAKEN, ADMIN_CANNOT_RENAME }

    private final AppUserRepository appUserRepository;
    private final ReleasedUsernameRepository releasedRepository;
    private final Set<String> adminUsernames;
    private final Duration hold;
    private final Clock clock;

    @Autowired
    public UsernameService(AppUserRepository appUserRepository,
                           ReleasedUsernameRepository releasedRepository,
                           @Value("${admin.usernames:}") String adminUsernames,
                           @Value("${jwt.expiration-ms}") long tokenLifetimeMs) {
        this(appUserRepository, releasedRepository, adminUsernames, Duration.ofMillis(tokenLifetimeMs), Clock.systemUTC());
    }

    // Visible for testing
    UsernameService(AppUserRepository appUserRepository, ReleasedUsernameRepository releasedRepository,
                    String adminUsernames, Duration hold, Clock clock) {
        this.appUserRepository = appUserRepository;
        this.releasedRepository = releasedRepository;
        this.adminUsernames = Arrays.stream(adminUsernames.split(","))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.hold = hold;
        this.clock = clock;
    }

    /**
     * Check the shape of a requested username.
     *
     * @return the error to show, or empty if it's fine (names are stored trimmed)
     */
    public Optional<String> validationError(String requested) {
        if (requested == null || requested.isBlank()) return Optional.of("Username is required");
        if (requested.trim().length() > MAX_LENGTH) {
            return Optional.of("Username must be " + MAX_LENGTH + " characters or fewer");
        }
        return Optional.empty();
    }

    /**
     * Whether {@code username} can be used by {@code userId} (null for a brand-new account).
     * It must not belong to another account, be an admin name, or be held after someone else's rename.
     */
    public boolean isAvailable(String username, Long userId) {
        if (adminUsernames.contains(username)) return false;
        Optional<AppUser> owner = appUserRepository.findByUsername(username);
        // A new account (userId null) can never take a name that already has an owner
        if (owner.isPresent() && (userId == null || !userId.equals(owner.get().getId()))) return false;
        return releasedRepository.findById(username)
                .map(released -> (userId != null && userId.equals(released.getUserId()))
                        || released.getReleasedAt().isBefore(clock.instant().minus(hold)))
                .orElse(true);
    }

    public boolean isAdmin(AppUser user) {
        return adminUsernames.contains(user.getUsername());
    }

    /**
     * Rename a user. The caller validates the shape first and issues a new login token on success,
     * since tokens carry the username.
     */
    @Transactional
    public RenameResult rename(AppUser user, String requested) {
        String newName = requested.trim();
        if (newName.equals(user.getUsername())) return RenameResult.UNCHANGED;
        if (isAdmin(user)) return RenameResult.ADMIN_CANNOT_RENAME;
        if (!isAvailable(newName, user.getId())) return RenameResult.TAKEN;

        Instant now = clock.instant();
        // Hold the old name; if it was held from an earlier rename, this restarts the hold
        releasedRepository.save(new ReleasedUsername(user.getUsername(), user.getId(), now));
        // Taking back one's own held name: it's in use again, so it's no longer released
        releasedRepository.findById(newName).ifPresent(releasedRepository::delete);
        user.setUsername(newName);
        try {
            appUserRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Someone took the name between the check and the save (unique index)
            throw new UsernameTakenException();
        }
        return RenameResult.RENAMED;
    }

    /** Thrown when another account claims the name at the same moment; rolls back the rename. */
    public static class UsernameTakenException extends RuntimeException {
        public UsernameTakenException() {
            super("Username already taken");
        }
    }
}
