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
import type { FavoritePlayer } from "../types";

/**
 * Render the application landing page with search bar and saved favorites.
 *
 * @returns the home page layout with centered search and favorites list
 */
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
        <p style={styles.subtitle}>Search for a player to view their match history</p>
        <SearchBar />
        <div style={styles.demoBadges}>
          {DEMO_PLAYERS.map((p) => (
            <button
              key={p.label}
              style={styles.demoBadge}
              onClick={() => navigate(`/player/puuid/${p.region}/${encodeURIComponent(p.puuid)}`)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.background = "#1e293b"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.background = "#0f172a"; }}
            >
              {p.label}
            </button>
          ))}
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
    background: "#0f172a",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    width: "100%",
  },
  title: {
    fontSize: 48,
    fontWeight: 800,
    margin: 0,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.5,
    marginTop: 8,
    marginBottom: 32,
  },
  authCorner: {
    position: "absolute",
    top: 16,
    right: 24,
  },
  authBtn: {
    background: "transparent",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  demoBadges: {
    display: "flex",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  demoBadge: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s ease",
  },
};