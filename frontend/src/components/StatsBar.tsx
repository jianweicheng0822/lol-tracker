/** Performance summary panel — donut win rate, KDA summary, and recent champion stats. */
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { PlayerStats, MatchSummary } from "../types";
import { useDdragonVersion, ddragonBase, championIconUrl, hideOnError } from "../utils/ddragon";

type StatsBarProps = {
  stats: PlayerStats;
  matches?: MatchSummary[];
};

// --- Champion performance aggregation ---
type ChampionPerf = {
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
};

function aggregateChampions(matches: MatchSummary[]): ChampionPerf[] {
  const map = new Map<string, ChampionPerf>();
  for (const m of matches) {
    let entry = map.get(m.championName);
    if (!entry) {
      entry = { championName: m.championName, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      map.set(m.championName, entry);
    }
    entry.games++;
    if (m.win) entry.wins++;
    entry.kills += m.kills;
    entry.deaths += m.deaths;
    entry.assists += m.assists;
  }
  return Array.from(map.values())
    .sort((a, b) => b.games - a.games)
    .slice(0, 3);
}

// --- Champion row ---
function ChampionRow({ champ, imgBase }: { champ: ChampionPerf; imgBase: string }) {
  const [hovered, setHovered] = useState(false);
  const wr = champ.games > 0 ? Math.round((champ.wins / champ.games) * 100) : 0;
  const kda = champ.deaths === 0
    ? (champ.kills + champ.assists).toFixed(1)
    : ((champ.kills + champ.assists) / champ.deaths).toFixed(2);
  const wrColor = wr >= 60 ? "#4a8fd4" : wr >= 50 ? "#8b9bb0" : "#b05050";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        borderRadius: 4,
        background: hovered ? "rgba(255,255,255,0.04)" : undefined,
        transition: "background 0.15s",
        cursor: "default",
      }}
    >
      <img
        src={championIconUrl(champ.championName, imgBase)}
        width={28}
        height={28}
        style={{ borderRadius: "50%", flexShrink: 0 }}
        onError={hideOnError}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {champ.championName}
        </div>
        <div style={{ fontSize: 10, color: "#546378" }}>
          {champ.wins}W {champ.games - champ.wins}L
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: wrColor }}>{wr}%</div>
        <div style={{ fontSize: 10, color: "#7e8fa6" }}>{kda} KDA</div>
      </div>
    </div>
  );
}

export default function StatsBar({ stats, matches }: StatsBarProps) {
  if (stats.totalGames === 0) return null;

  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion);

  const kdaColor =
    stats.averageKda >= 3 ? "#3a9e72" : stats.averageKda >= 2 ? "#c9981a" : "#b05050";

  const killParticipation = stats.totalGames > 0
    ? Math.round(((stats.averageKills + stats.averageAssists) / Math.max(stats.averageKills + stats.averageDeaths + stats.averageAssists, 1)) * 100)
    : 0;

  const donutData = [
    { name: "Wins", value: stats.wins },
    { name: "Losses", value: stats.losses },
  ];
  const donutColors = ["#4a8fd4", "#8b3a3a"];

  const champions = matches ? aggregateChampions(matches) : [];

  return (
    <div style={styles.container}>
      <div style={styles.layout}>
        {/* Left — Donut Chart */}
        <div style={styles.donutSection}>
          <div style={{ width: 88, height: 88, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={27}
                  outerRadius={38}
                  dataKey="value"
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {donutData.map((_, idx) => (
                    <Cell key={idx} fill={donutColors[idx]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={styles.donutCenter}>
              <div style={styles.donutPercent}>{stats.winRate}%</div>
              <div style={styles.donutLabel}>Win Rate</div>
            </div>
          </div>
          <div style={styles.donutRecord}>
            {stats.wins}W {stats.losses}L ({stats.totalGames} games)
          </div>
        </div>

        {/* Center — KDA Summary */}
        <div style={styles.kdaSection}>
          <div style={{ ...styles.kdaRatio, color: kdaColor }}>
            {stats.averageKda.toFixed(2)} : 1
          </div>
          <div style={styles.kdaBreakdown}>
            <span style={{ color: "#5b9ae6" }}>{stats.averageKills}</span>
            <span style={{ color: "#3d4a5c" }}> / </span>
            <span style={{ color: "#d06060" }}>{stats.averageDeaths}</span>
            <span style={{ color: "#3d4a5c" }}> / </span>
            <span style={{ color: "#45b5a8" }}>{stats.averageAssists}</span>
          </div>
          <div style={styles.kdaMeta}>
            P/Kill <span style={{ color: "#c45454", fontWeight: 600 }}>{killParticipation}%</span>
          </div>
        </div>

        {/* Right — Recent Champions */}
        {champions.length > 0 && (
          <div style={styles.champSection}>
            <div style={styles.champHeader}>Recent Champions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {champions.map((c) => (
                <ChampionRow key={c.championName} champ={c} imgBase={imgBase} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  layout: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },

  // Left — Donut
  donutSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
  },
  donutCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    pointerEvents: "none",
  },
  donutPercent: {
    fontSize: 18,
    fontWeight: 800,
    color: "#e2e8f0",
    lineHeight: 1,
  },
  donutLabel: {
    fontSize: 9,
    color: "#7e8fa6",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  donutRecord: {
    fontSize: 10,
    color: "#546378",
    marginTop: 4,
  },

  // Center — KDA
  kdaSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    padding: "0 32px",
    borderLeft: "1px solid rgba(255,255,255,0.06)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
  },
  kdaRatio: {
    fontSize: 30,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: -0.5,
  },
  kdaBreakdown: {
    fontSize: 13,
    fontWeight: 600,
    marginTop: 6,
  },
  kdaMeta: {
    fontSize: 11,
    color: "#7e8fa6",
    marginTop: 4,
  },

  // Right — Champions
  champSection: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  champHeader: {
    fontSize: 10,
    color: "#7e8fa6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 500,
    marginBottom: 4,
    paddingLeft: 8,
  },
};
