/** Aggregated player stats display — win rate, KDA, average kills/deaths/assists. */
import type { PlayerStats } from "../types";

type StatsBarProps = {
  stats: PlayerStats;
};

export default function StatsBar({ stats }: StatsBarProps) {
  if (stats.totalGames === 0) return null;

  const kdaColor = stats.averageKda >= 3 ? "#22c55e" : stats.averageKda >= 2 ? "#eab308" : "#ef4444";

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        <div style={styles.item}>
          <div style={styles.value}>{stats.winRate}%</div>
          <div style={styles.label}>Win Rate</div>
          <div style={styles.sub}>{stats.wins}W {stats.losses}L</div>
        </div>

        <div style={styles.item}>
          <div style={{ ...styles.value, color: kdaColor }}>{stats.averageKda.toFixed(2)}</div>
          <div style={styles.label}>KDA</div>
          <div style={styles.sub}>{stats.averageKills} / {stats.averageDeaths} / {stats.averageAssists}</div>
        </div>

        <div style={styles.item}>
          <div style={styles.value}>{stats.averageKills}</div>
          <div style={styles.label}>Avg Kills</div>
        </div>

        <div style={styles.item}>
          <div style={styles.value}>{stats.averageDeaths}</div>
          <div style={styles.label}>Avg Deaths</div>
        </div>

        <div style={styles.item}>
          <div style={styles.value}>{stats.averageAssists}</div>
          <div style={styles.label}>Avg Assists</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(30,41,59,0.5)",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 15,
  },
  item: {
    textAlign: "center",
    padding: 10,
    background: "rgba(15,23,42,0.4)",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.1)",
  },
  value: {
    fontSize: 22,
    fontWeight: 800,
    color: "#f8fafc",
  },
  label: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  sub: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
};