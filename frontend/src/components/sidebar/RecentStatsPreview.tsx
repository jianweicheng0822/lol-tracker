import type { PlayerStats } from "../../types";

type Props = {
  stats: PlayerStats;
  onClick: () => void;
};

export default function RecentStatsPreview({ stats, onClick }: Props) {
  if (stats.totalGames === 0) return null;

  const wrColor = stats.winRate >= 60 ? "#D4A017" : stats.winRate >= 50 ? "#7A7060" : "#C44040";
  const kdaColor = stats.averageKda >= 3 ? "#D4A017" : stats.averageKda >= 2 ? "#E8C84A" : "#C44040";

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
    background: "rgba(20,18,14,0.65)",
    border: "1px solid rgba(212,160,23,0.10)",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#4A4540",
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
    color: "#EDE4D3",
  },
  label: {
    fontSize: 10,
    color: "#4A4540",
    marginTop: 2,
  },
};
