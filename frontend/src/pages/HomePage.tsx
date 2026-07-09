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
import { fetchFavorites, fetchLeaderboard, getAuthToken, setAuthToken } from "../api";
import { COLORS } from "../utils/colors";
import { TIER_COLORS } from "../utils/lp";
import type { FavoritePlayer, LeaderboardEntry } from "../types";

const DEMO_PLAYERS = [
  { label: "duoking1 #freex", puuid: "JZsCBcQ18XWqlQS2NDBS0Vi9uuUnhJJjhIBdHvNFoTEM8qLzsvkMSTYbDneGtgqr6OOx7fCX0OeTXA", region: "NA" },
  { label: "EDG Viper #NA11", puuid: "87RUqIRwJjjEFIW8qEK8fhiCjgB2uU9y6ZnPQK2H2h2GpyjzTN76r6JaXOXJAqrczw1d05y0putLfA", region: "NA" },
] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!getAuthToken());
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);

  const loadFavorites = useCallback(() => {
    if (!getAuthToken()) {
      setFavorites([]);
      return;
    }
    fetchFavorites()
      .then(data => setFavorites(data))
      .catch(e => console.error("Failed to load favorites:", e));
  }, []);

  useEffect(() => {
    loadFavorites();
    fetchLeaderboard("NA", "RANKED_SOLO_5x5", "challenger", 0, 3)
      .then((data: { entries: LeaderboardEntry[] }) => setTopPlayers(data.entries))
      .catch(e => console.error("Failed to load leaderboard preview:", e));
  }, [loadFavorites]);

  return (
    <div style={styles.page}>
      <div style={styles.authCorner}>
        <button
          onClick={() => navigate("/multi-search")}
          style={styles.navLink}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${COLORS.gold}20`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Multi-Search
        </button>
        <button
          onClick={() => navigate("/leaderboard")}
          style={styles.navLink}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${COLORS.gold}20`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Leaderboard
        </button>
        {loggedIn ? (
          <button
            onClick={() => { setAuthToken(null); setLoggedIn(false); }}
            style={styles.logoutBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,64,87,0.12)"; e.currentTarget.style.borderColor = "rgba(232,64,87,0.5)"; e.currentTarget.style.color = "#E84057"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = COLORS.textSecondary; }}
          >
            Log out
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            style={styles.loginBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(58,143,214,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(58,143,214,0.08)"; }}
          >
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

        {topPlayers.length > 0 && (
          <div style={styles.leaderboardCard}>
            <div style={styles.leaderboardHeader}>
              <span style={styles.leaderboardTitle}>Top Ranked Players</span>
              <span style={styles.leaderboardRegion}>NA</span>
            </div>
            <div style={styles.leaderboardList}>
              {topPlayers.map((p, i) => (
                <div key={`${p.summonerName}-${i}`} style={styles.leaderboardRow}>
                  <span style={{
                    ...styles.leaderboardRank,
                    color: COLORS.gold,
                  }}>#{i + 1}</span>
                  <span style={styles.leaderboardName}>{p.summonerName}</span>
                  <span style={{
                    ...styles.leaderboardLp,
                    color: TIER_COLORS.CHALLENGER,
                  }}>{p.leaguePoints.toLocaleString()} LP</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/leaderboard")}
              style={styles.leaderboardBtn}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,160,23,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              View Full Leaderboard &rarr;
            </button>
          </div>
        )}

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
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  navLink: {
    background: "transparent",
    color: COLORS.gold,
    border: `1px solid ${COLORS.gold}50`,
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    padding: "6px 14px",
    transition: "background 0.15s ease",
  },
  leaderboardCard: {
    marginTop: 28,
    width: "100%",
    maxWidth: 420,
    border: `1px solid ${COLORS.gold}40`,
    borderRadius: 12,
    padding: "20px 24px",
    background: COLORS.cardBg,
  },
  leaderboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  leaderboardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.textPrimary,
  },
  leaderboardRegion: {
    fontSize: 12,
    color: COLORS.textDim,
    fontWeight: 600,
  },
  leaderboardList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  leaderboardRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  leaderboardRank: {
    width: 28,
    fontWeight: 700,
    fontSize: 14,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.textPrimary,
  },
  leaderboardLp: {
    fontSize: 13,
    fontWeight: 600,
  },
  leaderboardBtn: {
    marginTop: 16,
    width: "100%",
    background: "transparent",
    border: `1px solid ${COLORS.gold}40`,
    color: COLORS.gold,
    borderRadius: 8,
    padding: "8px 0",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    transition: "background 0.15s ease",
  },
  loginBtn: {
    background: "rgba(58,143,214,0.08)",
    color: "#3A8FD6",
    border: "1px solid rgba(58,143,214,0.4)",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    transition: "background 0.15s ease",
  },
  logoutBtn: {
    background: "transparent",
    color: COLORS.textSecondary,
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    transition: "all 0.15s ease",
  },
};
