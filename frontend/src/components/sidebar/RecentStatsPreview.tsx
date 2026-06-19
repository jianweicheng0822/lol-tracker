import type { PlayerStats, MatchSummary } from "../../types";

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

function computeMainRole(matches: MatchSummary[]): string | null {
  const counts: Record<string, number> = {};
  for (const m of matches) {
    const pos = m.individualPosition;
    if (pos && pos !== "" && pos !== "Invalid") {
      counts[pos] = (counts[pos] || 0) + 1;
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [role, count] of Object.entries(counts)) {
    if (count > max) { max = count; best = role; }
  }
  return best;
}

type Props = {
  stats: PlayerStats;
  matches: MatchSummary[];
  onClick: () => void;
};

export default function RecentStatsPreview({ stats, matches, onClick }: Props) {
  if (stats.totalGames === 0) return null;

  const wrColor = stats.winRate >= 60 ? "#D4A017" : stats.winRate >= 50 ? "#7A7060" : "#C44040";
  const kdaColor = stats.averageKda >= 3 ? "#D4A017" : stats.averageKda >= 2 ? "#E8C84A" : "#C44040";
  const mainRole = computeMainRole(matches);
  const roleLabel = mainRole ? ROLE_LABELS[mainRole] || mainRole : "\u2014";

  return (
    <div style={{ ...styles.card, cursor: "pointer" }} onClick={onClick}>
      <div style={styles.title}>Recent {stats.totalGames} Ranked {stats.totalGames === 1 ? "Game" : "Games"}</div>
      <div style={styles.row}>
        <div>
          <div style={{ ...styles.value, color: wrColor }}>{stats.winRate}%</div>
          <div style={styles.label}>Win Rate</div>
        </div>
        <div>
          <div style={styles.value}>{roleLabel}</div>
          <div style={styles.label}>Main Role</div>
        </div>
        <div>
          <div style={{ ...styles.value, color: kdaColor }}>{stats.averageKda.toFixed(2)}</div>
          <div style={styles.label}>KDA</div>
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
