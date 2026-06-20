/**
 * @file HomePage.tsx
 * @description Landing page with summoner search bar and favorites list.
 * @module frontend.pages
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import AuthModal from "../components/AuthModal";
import FavoritesList from "../components/FavoritesList";
import { fetchFavorites, getAuthToken, setAuthToken } from "../api";
import { COLORS } from "../utils/colors";
import type { FavoritePlayer } from "../types";

const DEMO_PLAYERS = [
  { label: "duoking1 #freex", puuid: "JZsCBcQ18XWqlQS2NDBS0Vi9uuUnhJJjhIBdHvNFoTEM8qLzsvkMSTYbDneGtgqr6OOx7fCX0OeTXA", region: "NA" },
  { label: "EDG Viper #NA11", puuid: "87RUqIRwJjjEFIW8qEK8fhiCjgB2uU9y6ZnPQK2H2h2GpyjzTN76r6JaXOXJAqrczw1d05y0putLfA", region: "NA" },
] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!getAuthToken());

  const loadFavorites = useCallback(() => {
    fetchFavorites()
      .then(data => setFavorites(data))
      .catch(e => console.error("Failed to load favorites:", e));
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <div style={styles.page}>
      <div style={styles.authCorner}>
        {loggedIn ? (
          <button
            onClick={() => { setAuthToken(null); setLoggedIn(false); }}
            style={styles.authBtn}
          >
            Log out
          </button>
        ) : (
          <button onClick={() => setShowAuthModal(true)} style={styles.authBtn}>
            Log in
          </button>
        )}
      </div>
      {showAuthModal && (
        <AuthModal
          onSuccess={() => { setLoggedIn(true); loadFavorites(); }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
      <div style={styles.center}>
        <h1 style={styles.title}>LoL Tracker</h1>
        <p style={styles.subtitle}>
          Track LP progression, analyze match history, and discover champion trends.
        </p>
        <div style={styles.searchWrapper}>
          <SearchBar />
        </div>

        <div style={styles.trySection}>
          <span style={styles.tryLabel}>Try searching</span>
          <div style={styles.demoBadges}>
            {DEMO_PLAYERS.map((p) => (
              <button
                key={p.label}
                style={styles.demoBadge}
                onClick={() => navigate(`/player/puuid/${p.region}/${encodeURIComponent(p.puuid)}`)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(212,160,23,0.45)"; e.currentTarget.style.background = "rgba(212,160,23,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "transparent"; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <FavoritesList favorites={favorites} onUpdate={loadFavorites} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: `radial-gradient(circle at 50% 40%, rgba(212,160,23,0.08), transparent 50%), ${COLORS.pageBg}`,
    color: COLORS.textPrimary,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    width: "100%",
    maxWidth: 720,
  },
  title: {
    fontSize: 60,
    fontWeight: 800,
    margin: 0,
    letterSpacing: -1.5,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textTertiary,
    marginTop: 12,
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 1.5,
  },
  searchWrapper: {
    width: "100%",
    maxWidth: 640,
  },
  trySection: {
    marginTop: 28,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  tryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.textDim,
    fontWeight: 600,
  },
  demoBadges: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  demoBadge: {
    padding: "8px 18px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: COLORS.textSecondary,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s ease",
  },
  authCorner: {
    position: "absolute",
    top: 16,
    right: 24,
  },
  authBtn: {
    background: "transparent",
    color: COLORS.textTertiary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
};
