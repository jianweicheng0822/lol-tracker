/**
 * @file AuthController.java
 * @description REST controller handling user registration and login with JWT authentication.
 * @module backend.controller
 */
package com.jw.backend;

import com.jw.backend.dto.AuthRequest;
import com.jw.backend.dto.AuthResponse;
import com.jw.backend.entity.AppUser;
import com.jw.backend.repository.AppUserRepository;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.RateLimitService;
import com.jw.backend.service.UsernameService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Map;
import java.util.Optional;

/**
 * Handle user authentication flows including registration and credential-based login.
 *
 * <p>Passwords are stored as BCrypt hashes. Successful authentication returns a signed
 * JWT token that clients include in subsequent requests via the Authorization header.</p>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RateLimitService rateLimitService;
    private final UsernameService usernameService;

    /**
     * Construct the controller with required authentication dependencies.
     *
     * @param appUserRepository repository for user persistence operations
     * @param passwordEncoder   encoder for hashing and verifying passwords
     * @param jwtUtil           utility for generating signed JWT tokens
     * @param rateLimitService  service for enforcing per-IP rate limits
     * @param usernameService   who may use which username
     */
    public AuthController(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder,
                           JwtUtil jwtUtil, RateLimitService rateLimitService, UsernameService usernameService) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.rateLimitService = rateLimitService;
        this.usernameService = usernameService;
    }

    /**
     * Register a new user account and return a JWT token upon success.
     *
     * @param request        contains username and password credentials
     * @param servletRequest HTTP request for extracting client IP
     * @return 201 with JWT token on success, 400 for invalid input, or 409 if username exists
     */
    static final int MAX_PASSWORD_BYTES = 72;
    static final String PASSWORD_RULE =
            "Password must be 8 to 72 characters (letters outside English count as 2 to 4)";

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request, HttpServletRequest servletRequest) {
        rateLimitService.checkRateLimit(servletRequest.getRemoteAddr(), 0);

        if (request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        // Stored trimmed, so " bob" and "bob" are the same account
        String username = request.username().trim();
        if (username.length() > 50) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username must be 50 characters or fewer"));
        }

        // BCrypt only takes 72 bytes (longer throws), and non-English letters are 2-4 bytes each
        if (request.password().length() < 8 || request.password().getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error", PASSWORD_RULE));
        }

        if (!usernameService.isAvailable(username, null)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Username already taken"));
        }

        AppUser user = new AppUser(username, passwordEncoder.encode(request.password()), true);
        appUserRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(token, user.getTier()));
    }

    /**
     * Authenticate an existing user and return a JWT token upon valid credentials.
     *
     * @param request        contains username and password credentials
     * @param servletRequest HTTP request for extracting client IP
     * @return 200 with JWT token on success, 400 for invalid input, or 401 for bad credentials
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request, HttpServletRequest servletRequest) {
        rateLimitService.checkRateLimit(servletRequest.getRemoteAddr(), 0);

        if (request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        // Exact name first (accounts made before names were trimmed), then the trimmed name
        Optional<AppUser> optUser = appUserRepository.findByUsername(request.username())
                .or(() -> appUserRepository.findByUsername(request.username().trim()));
        if (optUser.isEmpty() || !passwordEncoder.matches(request.password(), optUser.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }

        AppUser user = optUser.get();
        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(new AuthResponse(token, user.getTier()));
    }

    /** Body of PUT /api/auth/username. */
    public record UsernameChangeRequest(String username) {}

    /**
     * Change the logged-in user's username. Login tokens carry the username, so this answers with a
     * new token; the old one (and the user's other devices) stop working.
     *
     * @return 200 with {token, username}, 400 for a bad name, 401 if not logged in, 403 for an
     *         admin account (admin rights go by username), or 409 if the name isn't available
     */
    @PutMapping("/username")
    public ResponseEntity<?> changeUsername(@RequestBody UsernameChangeRequest request, Principal principal,
                                            HttpServletRequest servletRequest) {
        AppUser user = principal == null ? null : appUserRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        rateLimitService.checkRateLimit(servletRequest.getRemoteAddr(), 0);

        String requested = request == null ? null : request.username();
        Optional<String> invalid = usernameService.validationError(requested);
        if (invalid.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", invalid.get()));
        }

        UsernameService.RenameResult result;
        try {
            result = usernameService.rename(user, requested);
        } catch (UsernameService.UsernameTakenException e) {
            result = UsernameService.RenameResult.TAKEN;
        }
        return switch (result) {
            case RENAMED, UNCHANGED -> ResponseEntity.ok(Map.of(
                    "token", jwtUtil.generateToken(user.getUsername()),
                    "username", user.getUsername()));
            case TAKEN -> ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already taken"));
            case ADMIN_CANNOT_RENAME -> ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Admin accounts can't change their username"));
        };
    }

}
