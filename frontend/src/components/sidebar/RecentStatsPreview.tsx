import type { PlayerStats } from "../../types";

type Props = {
  stats: PlayerStats;
  onClick: () => void;
};

export default function RecentStatsPreview({ stats, onClick }: Props) {
  if (stats.totalGames === 0) return null;

  const wrColor = stats.winRate >= 60 ? "#4ade80" : stats.winRate >= 50 ? "#94a3b8" : "#f87171";
  const kdaColor = stats.averageKda >= 3 ? "#3a9e72" : stats.averageKda >= 2 ? "#c9981a" : "#b05050";

  return (
    <div style={{ ...styles.card, cursor: "pointer" }} onClick={onClick}>
      <div style={styles.title}>Recent Stats</div>
      <div style={styles.row}>
        <div>
          <div style={{ ...styles.value, color: wrColor }}>{stats.winRate}%</div>
          <div style={styles.label}>Win Rate</div>
        </div>
        <div>
          <div style={{ ...styles.value, color: kdaColor }}>{stats.averageKda.toFixed(2)}</div>
          <div style={styles.label}>KDA</div>
        </div>
        <div>
          <div style={styles.value}>{stats.totalGames}</div>
          <div style={styles.label}>Games</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#7e8fa6",
    fontWeight: 500,
    marginBottom: 8,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    textAlign: "center",
  },
  value: {
    fontSize: 18,
    fontWeight: 700,
    color: "#e2e8f0",
  },
  label: {
    fontSize: 10,
    color: "#7e8fa6",
    marginTop: 2,
  },
};
