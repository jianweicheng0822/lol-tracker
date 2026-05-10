/**
 * @file OverviewTab.tsx
 * @description Render the default Overview dashboard tab combining rank badges, stats panel,
 *   and a recent games summary. Uses a 2-column grid layout with no additional API calls
 *   since all data is passed from the parent PlayerPage.
 * @module frontend.components.tabs
 */
import type { PlayerStats, MatchSummary, RankedEntry } from "../../types";
import RankBadge from "../RankBadge";
import StatsBar from "../StatsBar";

type Props = {
  stats: PlayerStats | null;
  matches: MatchSummary[];
  ranked: RankedEntry[];
};

/**
 * Render the Overview tab with ranked badges, performance stats, recent game results strip,
 * and average KDA breakdown across the most recent 10 matches.
 *
 * @param props - Player stats, match list, and ranked entries (pre-fetched by PlayerPage).
 * @returns The overview tab content element.
 */
export default function OverviewTab({ stats, matches, ranked }: Props) {
  const recent10 = matches.slice(0, 10);
  const wins10 = recent10.filter((m) => m.win).length;
  const losses10 = recent10.length - wins10;

  return (
    <div style={styles.grid}>
      {/* Left column — rank badges and stats panel */}
      <div>
        <RankBadge entries={ranked} />
        {stats && <StatsBar stats={stats} matches={matches} />}
      </div>

      {/* Right column — recent games strip and KDA summary cards */}
      <div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Recent {recent10.length} Games</div>
          <div style={styles.recentBar}>
            {recent10.map((m) => (
              <div
                key={m.matchId}
                title={`${m.championName} — ${m.win ? "Win" : "Loss"}`}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: m.win ? "#1a4a2e" : "#4a1a1a",
                  border: `1px solid ${m.win ? "#2d6b45" : "#6b2d2d"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: m.win ? "#4ade80" : "#f87171",
                }}
              >
                {m.win ? "W" : "L"}
              </div>
            ))}
          </div>
          <div style={styles.recentRecord}>
            <span style={{ color: "#4ade80" }}>{wins10}W</span>
            {" "}
            <span style={{ color: "#f87171" }}>{losses10}L</span>
            {recent10.length > 0 && (
              <span style={{ color: "#94a3b8", marginLeft: 8 }}>
                ({Math.round((wins10 / recent10.length) * 100)}% win rate)
              </span>
            )}
          </div>
        </div>

        {recent10.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Recent KDA</div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              <Stat label="Avg Kills" value={(recent10.reduce((s, m) => s + m.kills, 0) / recent10.length).toFixed(1)} color="#5b9ae6" />
              <Stat label="Avg Deaths" value={(recent10.reduce((s, m) => s + m.deaths, 0) / recent10.length).toFixed(1)} color="#d06060" />
              <Stat label="Avg Assists" value={(recent10.reduce((s, m) => s + m.assists, 0) / recent10.length).toFixed(1)} color="#45b5a8" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Render a single stat display with a large colored value and a small label beneath it.
 *
 * @param props - The label text, formatted value string, and accent color.
 * @returns The stat display element.
 */
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#7e8fa6", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  card: {
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#7e8fa6",
    fontWeight: 500,
    marginBottom: 12,
  },
  recentBar: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  recentRecord: {
    fontSize: 13,
    fontWeight: 600,
  },
};
