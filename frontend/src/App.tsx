import React, { useEffect, useMemo, useState } from "react";

// --- Type Definitions ---
type Region = "NA" | "EUW" | "KR" | "JP" | "BR" | "OCE";

type Account = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

type MatchSummary = {
  matchId: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  gameDurationSec: number;
  gameEndTimestamp: number;
};

type PlayerStats = {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKills: number;
  averageDeaths: number;
  averageAssists: number;
  averageKda: number;
};

type FavoritePlayer = {
  id: number;
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
  savedAt: string;
};

export default function LoLTracker() {
  // --- State Hooks ---
  const [gameName, setGameName] = useState("");
  const [tag, setTag] = useState("");
  const [region, setRegion] = useState<Region>("NA");

  const [account, setAccount] = useState<Account | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // --- Helpers ---
  const canSearch = useMemo(() => {
    return gameName.trim().length > 0 && tag.trim().length > 0;
  }, [gameName, tag]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const wlLabel = (win: boolean) => (win ? "WIN" : "LOSS");

  const championIconUrl = (name: string) =>
    `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${name}.png`;

  const readErrorMessage = async (res: Response) => {
    try {
      const type = res.headers.get("content-type") || "";
      if (type.includes("application/json")) {
        const body = await res.json();
        return body?.message || body?.error || `Error ${res.status}: ${res.statusText}`;
      }
      return (await res.text()) || `Status ${res.status}`;
    } catch {
      return "An unknown network error occurred.";
    }
  };

  // Load favorites on app start
  const loadFavorites = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (e) {
      console.error("Failed to load favorites:", e);
    }
  };

  // Check if current player is a favorite
  const checkIsFavorite = async (puuid: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/favorites/check/${puuid}`);
      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.isFavorite);
      }
    } catch (e) {
      console.error("Failed to check favorite:", e);
    }
  };

  // Add current player to favorites
  const addToFavorites = async () => {
    if (!account) return;

    try {
      const res = await fetch("http://localhost:8080/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puuid: account.puuid,
          gameName: account.gameName,
          tagLine: account.tagLine,
          region: region,
        }),
      });

      if (res.ok) {
        setIsFavorite(true);
        loadFavorites(); // Refresh list
      }
    } catch (e) {
      console.error("Failed to add favorite:", e);
    }
  };

  // Remove player from favorites
  const removeFromFavorites = async (puuid: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/favorites/${puuid}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (account?.puuid === puuid) {
          setIsFavorite(false);
        }
        loadFavorites(); // Refresh list
      }
    } catch (e) {
      console.error("Failed to remove favorite:", e);
    }
  };

  // Load a favorite player (search for them)
  const loadFavoritePlayer = (fav: FavoritePlayer) => {
    setGameName(fav.gameName);
    setTag(fav.tagLine);
    setRegion(fav.region as Region);
  };

  // Load favorites when app starts
  useEffect(() => {
    loadFavorites();
  }, []);

  const search = async () => {
    if (!canSearch) return;

    setStatus("loading");
    setErrorMsg("");
    setAccount(null);
    setMatches([]);
    setStats(null);
    setExpandedMatchId(null);
    setIsFavorite(false);

    try {
      // 1) Account
      const accountRes = await fetch(
        `http://localhost:8080/api/summoner?gameName=${encodeURIComponent(gameName)}&tag=${encodeURIComponent(
          tag.replace(/^#/, "")
        )}&region=${region}`
      );

      if (!accountRes.ok) {
        throw new Error(await readErrorMessage(accountRes));
      }

      const accountData: Account = await accountRes.json();
      setAccount(accountData);

      // 2) Summary (Top 10 for stats, display 3)
      const sumRes = await fetch(
        `http://localhost:8080/api/matches/summary?puuid=${encodeURIComponent(accountData.puuid)}&region=${region}&count=10`
      );

      if (!sumRes.ok) {
        throw new Error(await readErrorMessage(sumRes));
      }

      const matchesData = await sumRes.json();
      setMatches(Array.isArray(matchesData) ? matchesData : []);

      // 3) Player Stats (from last 10 games)
      const statsRes = await fetch(
        `http://localhost:8080/api/stats?puuid=${encodeURIComponent(accountData.puuid)}&region=${region}&count=10`
      );

      if (statsRes.ok) {
        const statsData: PlayerStats = await statsRes.json();
        setStats(statsData);
      }

      // 4) Check if this player is a favorite
      await checkIsFavorite(accountData.puuid);

      setStatus("idle");
    } catch (e: any) {
      console.error("Search error:", e);
      setStatus("error");
      setErrorMsg(e?.message || "Something went wrong.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>LoL Tracker</h1>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div style={styles.favoritesSection}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 14, opacity: 0.8 }}>
              Favorite Players
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {favorites.map((fav) => (
                <div key={fav.id} style={styles.favoriteChip}>
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => loadFavoritePlayer(fav)}
                    title="Click to search"
                  >
                    {fav.gameName}#{fav.tagLine}
                  </span>
                  <button
                    style={styles.removeButton}
                    onClick={() => removeFromFavorites(fav.puuid)}
                    title="Remove from favorites"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.formRow}>
          <select
            style={styles.select}
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
          >
            {(["NA", "EUW", "KR", "JP", "BR", "OCE"] as Region[]).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <input
            style={styles.input}
            placeholder="Game Name"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />

          <input
            style={{ ...styles.input, width: 110 }}
            placeholder="#Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />

          <button
            style={canSearch && status !== "loading" ? styles.button : styles.buttonDisabled}
            disabled={!canSearch || status === "loading"}
            onClick={search}
          >
            {status === "loading" ? "Searching..." : "Search"}
          </button>
        </div>

        {status === "error" && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {account && (
          <div style={styles.accountHeader}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>
                {account.gameName} <span style={{ color: "#94a3b8" }}>#{account.tagLine}</span>
              </h2>
              <button
                style={isFavorite ? styles.favoriteButtonActive : styles.favoriteButton}
                onClick={() => isFavorite ? removeFromFavorites(account.puuid) : addToFavorites()}
              >
                {isFavorite ? "★ Favorited" : "☆ Add to Favorites"}
              </button>
            </div>
          </div>
        )}

        {/* Player Stats Summary */}
        {stats && stats.totalGames > 0 && (
          <div style={styles.statsBox}>
            <h3 style={{ margin: "0 0 15px 0", fontSize: 16 }}>
              Stats (Last {stats.totalGames} Games)
            </h3>
            <div style={styles.statsGrid}>
              {/* Win Rate */}
              <div style={styles.statItem}>
                <div style={styles.statValue}>
                  {stats.winRate}%

                </div>
                <div style={styles.statLabel}>Win Rate</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {stats.wins}W {stats.losses}L
                </div>
              </div>

              {/* KDA */}
              <div style={styles.statItem}>
                <div style={{
                  ...styles.statValue,
                  color: stats.averageKda >= 3 ? "#22c55e" : stats.averageKda >= 2 ? "#eab308" : "#ef4444"
                }}>
                  {stats.averageKda.toFixed(2)}
                </div>
                <div style={styles.statLabel}>KDA</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {stats.averageKills} / {stats.averageDeaths} / {stats.averageAssists}
                </div>
              </div>

              {/* Average Kills */}
              <div style={styles.statItem}>
                <div style={styles.statValue}>{stats.averageKills}</div>
                <div style={styles.statLabel}>Avg Kills</div>
              </div>

              {/* Average Deaths */}
              <div style={styles.statItem}>
                <div style={styles.statValue}>{stats.averageDeaths}</div>
                <div style={styles.statLabel}>Avg Deaths</div>
              </div>

              {/* Average Assists */}
              <div style={styles.statItem}>
                <div style={styles.statValue}>{stats.averageAssists}</div>
                <div style={styles.statLabel}>Avg Assists</div>
              </div>
            </div>
          </div>
        )}

        {matches.length > 0 && (
          <div style={styles.grid}>
            {matches.map((m) => {
              const expanded = expandedMatchId === m.matchId;

              return (
                <div
                  key={m.matchId}
                  style={{
                    ...styles.card2,
                    cursor: "pointer",
                    outline: expanded
                      ? "1px solid rgba(99,102,241,0.9)"
                      : "1px solid rgba(148,163,184,0.12)",
                    background: expanded ? "rgba(30,41,59,0.55)" : "rgba(30,41,59,0.35)",
                  }}
                  onClick={() => setExpandedMatchId(expanded ? null : m.matchId)}
                  title="Click to expand"
                >
                  <div style={styles.topRow}>
                    <div style={styles.leftRow}>
                      <img
                        src={championIconUrl(m.championName)}
                        width={36}
                        height={36}
                        style={styles.champIcon}
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                      <div>
                        <div style={{ fontWeight: 800 }}>{m.championName}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          K/D/A: {m.kills}/{m.deaths}/{m.assists}
                        </div>
                      </div>
                    </div>

                    <div style={{ ...styles.badge, background: m.win ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)" }}>
                      {wlLabel(m.win)}
                    </div>
                  </div>

                  <div style={styles.metaLine}>
                    Duration: {formatDuration(m.gameDurationSec)}
                    <span style={{ opacity: 0.5, margin: "0 8px" }}>•</span>
                    {new Date(m.gameEndTimestamp).toLocaleString()}
                  </div>

                  {expanded && (
                    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                        <div style={{ opacity: 0.7 }}>Match ID</div>
                        <code style={styles.codeInline}>{m.matchId}</code>

                        <div style={{ opacity: 0.7 }}>Result</div>
                        <div>{wlLabel(m.win)}</div>

                        <div style={{ opacity: 0.7 }}>K/D/A</div>
                        <div>
                          {m.kills}/{m.deaths}/{m.assists}
                        </div>

                        <div style={{ opacity: 0.7 }}>Duration</div>
                        <div>{formatDuration(m.gameDurationSec)}</div>

                        <div style={{ opacity: 0.7 }}>Ended</div>
                        <div>{new Date(m.gameEndTimestamp).toLocaleString()}</div>
                      </div>

                      <div style={{ marginTop: 10, opacity: 0.7 }}>Click again to collapse.</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- CSS-in-JS Styles ---
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "40px 20px",
    background: "#0f172a",
    minHeight: "100vh",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  card: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "#1e293b",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
  },
  title: { textAlign: "center", marginBottom: "30px" },
  formRow: { display: "flex", gap: "10px", marginBottom: "30px" },
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    outline: "none",
  },
  select: {
    padding: "12px",
    borderRadius: "8px",
    background: "#0f172a",
    color: "white",
    border: "1px solid #334155",
    outline: "none",
  },
  button: {
    padding: "12px 24px",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  },
  buttonDisabled: {
    padding: "12px 24px",
    borderRadius: "8px",
    background: "#334155",
    color: "#94a3b8",
    cursor: "not-allowed",
    border: "none",
    fontWeight: "bold",
  },
  errorBox: {
    background: "#7f1d1d",
    color: "#fecaca",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  accountHeader: {
    marginBottom: "20px",
    borderBottom: "1px solid #334155",
    paddingBottom: "10px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "15px",
  },
  card2: {
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(30,41,59,0.35)",
  },

  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  leftRow: { display: "flex", alignItems: "center", gap: 10 },
  champIcon: { borderRadius: 10, border: "1px solid rgba(148,163,184,0.18)" },

  badge: {
    fontWeight: 900,
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.18)",
    letterSpacing: 0.4,
  },

  metaLine: { marginTop: 10, fontSize: 12, opacity: 0.8 },

  codeInline: {
    padding: "2px 6px",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.55)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    overflowWrap: "anywhere",
  },

  // Stats Summary Styles
  statsBox: {
    background: "rgba(30,41,59,0.5)",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 15,
  },
  statItem: {
    textAlign: "center" as const,
    padding: 10,
    background: "rgba(15,23,42,0.4)",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.1)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "#f8fafc",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },

  // Favorites Styles
  favoritesSection: {
    background: "rgba(30,41,59,0.3)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  favoriteChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 20,
    padding: "6px 12px",
    fontSize: 13,
  },
  removeButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
  },
  favoriteButton: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#a5b4fc",
    cursor: "pointer",
    fontSize: 13,
  },
  favoriteButtonActive: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(99,102,241,0.3)",
    border: "1px solid rgba(99,102,241,0.5)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontSize: 13,
  },
};
