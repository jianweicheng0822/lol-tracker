import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import StatsBar from "../components/StatsBar";
import MatchList, { useDdragonVersion } from "../components/MatchList";
import RankBadge from "../components/RankBadge";
import { fetchAccount, fetchMatchSummaries, fetchStats, fetchRanked, checkIsFavorite, addFavorite, removeFavorite } from "../api";
import type { Region, Account, MatchSummary, PlayerStats, RankedEntry } from "../types";

export default function PlayerPage() {
  const { region, gameName, tag } = useParams<{ region: string; gameName: string; tag: string }>();

  const [account, setAccount] = useState<Account | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [ranked, setRanked] = useState<RankedEntry[]>([]);
  const [isFav, setIsFav] = useState(false);

  const ddVersion = useDdragonVersion();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!region || !gameName || !tag) return;

    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setErrorMsg("");
      setAccount(null);
      setMatches([]);
      setStats(null);
      setRanked([]);
      setIsFav(false);

      try {
        const acc = await fetchAccount(gameName, tag, region);
        if (cancelled) return;
        setAccount(acc);

        const [matchData, statsData, rankedData, favStatus] = await Promise.all([
          fetchMatchSummaries(acc.puuid, region, 10),
          fetchStats(acc.puuid, region, 10),
          fetchRanked(acc.puuid, region).catch((e) => { console.error("Ranked fetch failed:", e); return []; }),
          checkIsFavorite(acc.puuid),
        ]);

        if (cancelled) return;
        setMatches(Array.isArray(matchData) ? matchData : []);
        setStats(statsData);
        setRanked(Array.isArray(rankedData) ? rankedData : []);
        setIsFav(favStatus);
        setStatus("done");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(e?.message || "Something went wrong.");
      }
    };

    load();
    return () => { cancelled = true; };
  }, [region, gameName, tag]);

  const toggleFavorite = async () => {
    if (!account || !region) return;
    try {
      if (isFav) {
        await removeFavorite(account.puuid);
        setIsFav(false);
      } else {
        await addFavorite(account.puuid, account.gameName, account.tagLine, region);
        setIsFav(true);
      }
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    }
  };

  return (
    <div style={styles.page}>
      {/* Top bar with search */}
      <div style={styles.topBar}>
        <span style={styles.logo} onClick={() => window.location.href = "/"}>LoL Tracker</span>
        <SearchBar
          compact
          initialRegion={region as Region}
          initialGameName={decodeURIComponent(gameName || "")}
          initialTag={decodeURIComponent(tag || "")}
        />
      </div>

      {/* Content */}
      <div style={styles.content}>
        {status === "loading" && (
          <div style={styles.loadingBox}>Loading player data...</div>
        )}

        {status === "error" && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {status === "done" && account && (
          <>
            {/* Player header */}
            <div style={styles.header}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${account.profileIconId}.png`}
                  alt="Profile Icon"
                  style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #334155" }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: 28 }}>
                    {account.gameName}
                    <span style={{ color: "#64748b", fontWeight: 400 }}> #{account.tagLine}</span>
                  </h2>
                  <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>{region}</div>
                </div>
              </div>
              <button style={isFav ? styles.favBtnActive : styles.favBtn} onClick={toggleFavorite}>
                {isFav ? "★ Favorited" : "☆ Favorite"}
              </button>
            </div>

            {/* Ranked info */}
            <RankBadge entries={ranked} />

            {/* Stats */}
            {stats && <StatsBar stats={stats} />}

            {/* Match list */}
            <MatchList matches={matches} region={region} puuid={account.puuid} />
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "12px 24px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
  },
  logo: {
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  content: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "30px 20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #334155",
  },
  favBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#a5b4fc",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  favBtnActive: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(99,102,241,0.25)",
    border: "1px solid rgba(99,102,241,0.5)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  loadingBox: {
    textAlign: "center",
    padding: 40,
    opacity: 0.6,
    fontSize: 16,
  },
  errorBox: {
    background: "#7f1d1d",
    color: "#fecaca",
    padding: 15,
    borderRadius: 8,
  },
};