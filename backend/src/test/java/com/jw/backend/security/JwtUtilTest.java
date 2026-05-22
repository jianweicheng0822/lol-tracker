package com.jw.backend.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String VALID_SECRET = "thisIsATestSecretKeyThatIsAtLeast32BytesLong!";
    private static final long EXPIRATION_MS = 86400000;

    private JwtUtil createUtil() {
        return new JwtUtil(VALID_SECRET, EXPIRATION_MS);
    }

    @Test
    void constructor_withNullSecret_throwsIllegalState() {
        assertThrows(IllegalStateException.class, () -> new JwtUtil(null, EXPIRATION_MS));
    }

    @Test
    void constructor_withBlankSecret_throwsIllegalState() {
        assertThrows(IllegalStateException.class, () -> new JwtUtil("   ", EXPIRATION_MS));
    }

    @Test
    void constructor_withShortSecret_throwsIllegalState() {
        assertThrows(IllegalStateException.class, () -> new JwtUtil("short", EXPIRATION_MS));
    }

    @Test
    void constructor_withValidSecret_succeeds() {
        assertDoesNotThrow(() -> new JwtUtil(VALID_SECRET, EXPIRATION_MS));
    }

    @Test
    void generateToken_returnsNonNullString() {
        JwtUtil util = createUtil();
        String token = util.generateToken("testuser");
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractUsername_returnsCorrectSubject() {
        JwtUtil util = createUtil();
        String token = util.generateToken("alice");
        assertEquals("alice", util.extractUsername(token));
    }

    @Test
    void isTokenValid_withValidToken_returnsTrue() {
        JwtUtil util = createUtil();
        String token = util.generateToken("bob");
        assertTrue(util.isTokenValid(token));
    }

    @Test
    void isTokenValid_withGarbageToken_returnsFalse() {
        JwtUtil util = createUtil();
        assertFalse(util.isTokenValid("not.a.valid.token"));
    }

    @Test
    void isTokenValid_withTamperedToken_returnsFalse() {
        JwtUtil util = createUtil();
        String token = util.generateToken("user");
        // Flip a character in the signature portion
        String tampered = token.substring(0, token.length() - 2) + "XX";
        assertFalse(util.isTokenValid(tampered));
    }

    @Test
    void isTokenValid_withExpiredToken_returnsFalse() {
        // Token with 1ms expiration — will be expired by the time we validate
        JwtUtil shortLived = new JwtUtil(VALID_SECRET, 1);
        String token = shortLived.generateToken("expired-user");
        try { Thread.sleep(10); } catch (InterruptedException ignored) {}
        assertFalse(shortLived.isTokenValid(token));
    }

    @Test
    void isTokenValid_withDifferentKey_returnsFalse() {
        JwtUtil util1 = new JwtUtil(VALID_SECRET, EXPIRATION_MS);
        JwtUtil util2 = new JwtUtil("aCompletelyDifferentSecretKeyThatIs32Bytes!", EXPIRATION_MS);
        String token = util1.generateToken("user");
        assertFalse(util2.isTokenValid(token));
    }
}
