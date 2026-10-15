/**
 * @file HomePage.tsx
 * @description Landing page with summoner search bar and favorites list.
 * @module frontend.pages
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import AppHeader from "../components/AppHeader";
import FavoritesList from "../components/FavoritesList";
import { fetchFavorites, fetchLeaderboard, getAuthToken } from "../api";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "../utils/colors";
import { TIER_COLORS } from "../utils/lp";
import type { FavoritePlayer, LeaderboardEntry } from "../types";
import { FALLBACK_DEMO_PLAYERS, pickDemoPlayers, type DemoPlayer } from "../utils/demoPlayers";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// The preview card shows the top 3; "Try searching" picks from the next ones so names don't repeat
const LEADERBOARD_FETCH_SIZE = 20;
const PREVIEW_SIZE = 3;

export default function HomePage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);
  const { isLoggedIn } = useAuth();
  useDocumentTitle();
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [demoPlayers, setDemoPlayers] = useState<DemoPlayer[]>(FALLBACK_DEMO_PLAYERS);

  const loadFavorites = useCallback(() => {
    if (!getAuthToken()) {
      setFavorites([]);
      return;
    }
    fetchFavorites()
      .then(data => setFavorites(data))
      .catch(e => console.error("Failed to load favorites:", e));
  }, []);

  // Favorites belong to the account, so reload them whenever the user logs in or out
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchFavorites()
      .then(data => setFavorites(data))
      .catch(e => console.error("Failed to load favorites:", e));
  }, [isLoggedIn]);

  useEffect(() => {
    fetchLeaderboard("NA", "RANKED_SOLO_5x5", "challenger", 0, LEADERBOARD_FETCH_SIZE)
      .then((data: { entries: LeaderboardEntry[] }) => {
        setTopPlayers(data.entries.slice(0, PREVIEW_SIZE));
        const picks = pickDemoPlayers(data.entries.slice(PREVIEW_SIZE), "NA");
        if (picks.length > 0) setDemoPlayers(picks);
      })
      .catch(e => console.error("Failed to load leaderboard preview:", e));
  }, []);

  return (
    <div style={styles.page}>
      <AppHeader showSearch={false} showLogo={false} transparent />
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
            {demoPlayers.map((p) => (
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
                <button
                  key={`${p.summonerName}-${i}`}
                  style={styles.leaderboardRow}
                  onClick={() => navigate(`/player/puuid/NA/${encodeURIComponent(p.puuid)}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{
                    ...styles.leaderboardRank,
                    color: COLORS.gold,
                  }}>#{i + 1}</span>
                  <span style={styles.leaderboardName}>{p.summonerName}</span>
                  <span style={{
                    ...styles.leaderboardLp,
                    color: TIER_COLORS.CHALLENGER,
                  }}>{p.leaguePoints.toLocaleString()} LP</span>
                </button>
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

        <FavoritesList favorites={isLoggedIn ? favorites : []} onUpdate={loadFavorites} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: `radial-gradient(circle at 50% 40%, rgba(212,160,23,0.08), transparent 50%), ${COLORS.pageBg}`,
    color: COLORS.textPrimary,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px 60px",
    width: "100%",
    maxWidth: 720,
    margin: "0 auto",
    boxSizing: "border-box",
  },
  title: {
    fontSize: "clamp(40px, 11vw, 60px)",
    fontWeight: 800,
    margin: 0,
    letterSpacing: -1.5,
    // Gold gradient text with a soft glow, matching the gold used across the UI
    background: "linear-gradient(180deg, #F7DE8A 0%, #D4A017 55%, #9C7410 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    filter: "drop-shadow(0 4px 24px rgba(212,160,23,0.35))",
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
    width: "100%",
    // Reset button styles so rows look like the list they replace
    background: "transparent",
    border: "none",
    borderRadius: 6,
    padding: "4px 6px",
    margin: "0 -6px",
    boxSizing: "content-box",
    color: "inherit",
    font: "inherit",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.15s",
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
};
