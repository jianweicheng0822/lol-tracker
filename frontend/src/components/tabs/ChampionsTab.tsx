/**
 * Champions tab — grid of champion performance cards sorted by games played.
 * Each card shows: champion icon, name, games played, win rate, KDA, avg damage, and avg CS.
 *
 * Data is fetched lazily from /api/trends/champions on tab activation.
 * Uses a 2-column grid layout with color-coded stats:
 *   - Win rate: green (60%+), slate (50%+), red (<50%)
 *   - KDA: green (3+), gold (2+), red (<2)
 */
import { useEffect, useState } from "react";
import { fetchChampionStats } from "../../api";
import { useDdragonVersion, ddragonBase, championIconUrl, hideOnError } from "../../utils/ddragon";
import type { ChampionStats } from "../../types";

type Props = { puuid: string };

export default function ChampionsTab({ puuid }: Props) {
  const [champions, setChampions] = useState<ChampionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion); // Base URL for DDragon champion icons

  // Lazy fetch — only loads when the Champions tab is first activated
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchChampionStats(puuid)
      .then((data) => {
        if (cancelled) return;
        setChampions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [puuid]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>Loading champion stats...</div>;
  if (champions.length === 0) return <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>No champion data available yet.</div>;

  return (
    <div style={styles.grid}>
      {champions.map((c) => {
        // Color-code win rate: green for high, slate for average, red for low
        const wrColor = c.winRate >= 60 ? "#4ade80" : c.winRate >= 50 ? "#94a3b8" : "#f87171";
        // Color-code KDA: green for excellent, gold for decent, red for poor
        const kdaColor = c.avgKda >= 3 ? "#3a9e72" : c.avgKda >= 2 ? "#c9981a" : "#b05050";

        return (
          <div key={c.championName} style={styles.card}>
            {/* Champion header — circular icon with name and game count */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {/* Champion portrait from DDragon CDN */}
              <img
                src={championIconUrl(c.championName, imgBase)}
                width={40}
                height={40}
                style={{ borderRadius: "50%", flexShrink: 0 }}
                onError={hideOnError}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{c.championName}</div>
                <div style={{ fontSize: 11, color: "#7e8fa6" }}>{c.games} games</div>
              </div>
            </div>
            {/* Stat row — evenly spaced metrics across the card width */}
            <div style={styles.statsRow}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: wrColor }}>{c.winRate}%</div>
                <div style={styles.statLabel}>Win Rate</div>
                <div style={{ fontSize: 10, color: "#546378" }}>{c.wins}W {c.games - c.wins}L</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: kdaColor }}>{c.avgKda.toFixed(2)}</div>
                <div style={styles.statLabel}>KDA</div>
                <div style={{ fontSize: 10, color: "#546378" }}>{c.avgKills}/{c.avgDeaths}/{c.avgAssists}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{Math.round(c.avgDamage).toLocaleString()}</div>
                <div style={styles.statLabel}>Avg Dmg</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{c.avgCs}</div>
                <div style={styles.statLabel}>Avg CS</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  card: {
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 10,
    padding: 16,
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-around",
  },
  statLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#7e8fa6",
    letterSpacing: 0.4,
    marginTop: 1,
  },
};
