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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    /**
     * Construct the controller with required authentication dependencies.
     *
     * @param appUserRepository repository for user persistence operations
     * @param passwordEncoder   encoder for hashing and verifying passwords
     * @param jwtUtil           utility for generating signed JWT tokens
     */
    public AuthController(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Register a new user account and return a JWT token upon success.
     *
     * @param request contains username and password credentials
     * @return 201 with JWT token on success, 400 for invalid input, or 409 if username exists
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        if (request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        if (appUserRepository.findByUsername(request.username()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Username already taken"));
        }

        AppUser user = new AppUser(request.username(), passwordEncoder.encode(request.password()), true);
        appUserRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(token, user.getTier()));
    }

    /**
     * Authenticate an existing user and return a JWT token upon valid credentials.
     *
     * @param request contains username and password credentials
     * @return 200 with JWT token on success, 400 for invalid input, or 401 for bad credentials
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        if (request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        Optional<AppUser> optUser = appUserRepository.findByUsername(request.username());
        if (optUser.isEmpty() || !passwordEncoder.matches(request.password(), optUser.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }

        AppUser user = optUser.get();
        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(new AuthResponse(token, user.getTier()));
    }
}
