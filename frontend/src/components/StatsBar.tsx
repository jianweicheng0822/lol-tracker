import type { PlayerStats, MatchSummary } from "../types";
import { useDdragonVersion, ddragonBase, championIconUrl, hideOnError } from "../utils/ddragon";
import { computeStreak, computeRecentForm, computeMainChampion } from "../utils/playerInsights";

type StatsBarProps = {
  stats: PlayerStats;
  matches: MatchSummary[];
};

function wrColor(wr: number): string {
  return wr >= 60 ? "#4a8fd4" : wr >= 50 ? "#8b9bb0" : "#b05050";
}

function kdaColor(kda: number): string {
  return kda >= 3 ? "#3a9e72" : kda >= 2 ? "#c9981a" : "#b05050";
}

export default function StatsBar({ stats, matches }: StatsBarProps) {
  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion);

  if (stats.totalGames === 0) return null;

  const streak = computeStreak(matches);
  const recentForm = computeRecentForm(matches, 5);
  const mainChamp = computeMainChampion(matches);

  return (
    <div style={styles.container}>
      <div style={styles.layout}>
        {/* Win Rate */}
        <div style={styles.cell}>
          <div style={{ fontSize: 24, fontWeight: 800, color: wrColor(stats.winRate), lineHeight: 1 }}>
            {stats.winRate}%
          </div>
          <div style={styles.subtext}>
            {stats.wins}W {stats.losses}L
          </div>
        </div>

        <div style={styles.divider} />

        {/* KDA */}
        <div style={styles.cell}>
          <div style={{ fontSize: 24, fontWeight: 800, color: kdaColor(stats.averageKda), lineHeight: 1 }}>
            {stats.averageKda.toFixed(2)}
          </div>
          <div style={styles.subtext}>
            <span style={{ color: "#5b9ae6" }}>{stats.averageKills}</span>
            <span style={{ color: "#3d4a5c" }}> / </span>
            <span style={{ color: "#d06060" }}>{stats.averageDeaths}</span>
            <span style={{ color: "#3d4a5c" }}> / </span>
            <span style={{ color: "#45b5a8" }}>{stats.averageAssists}</span>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Streak */}
        <div style={styles.cell}>
          {streak ? (
            <>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1,
                color: streak.type === "win" ? "#3a9e72" : "#d06060",
              }}>
                {streak.type === "win" ? "\u2191" : "\u2193"} {streak.count}{streak.type === "win" ? "W" : "L"}
              </div>
              <div style={styles.subtext}>Streak</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: "#546378" }}>
                &mdash;
              </div>
              <div style={styles.subtext}>No streak</div>
            </>
          )}
        </div>

        <div style={styles.divider} />

        {/* Main Champion */}
        <div style={{ ...styles.cell, flexDirection: "row", gap: 8 }}>
          {mainChamp ? (
            <>
              <img
                src={championIconUrl(mainChamp.name, imgBase)}
                width={28}
                height={28}
                style={{ borderRadius: "50%", flexShrink: 0 }}
                onError={hideOnError}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", lineHeight: 1.2 }}>
                  {mainChamp.name}
                </div>
                <div style={styles.subtext}>
                  {mainChamp.games}G &middot; {mainChamp.winRate}% WR
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#546378" }}>&mdash;</div>
          )}
        </div>

        <div style={styles.divider} />

        {/* Recent Form */}
        <div style={styles.cell}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {matches.slice(0, 5).map((m, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: m.win ? "#3a9e72" : "#d06060",
                }}
              />
            ))}
          </div>
          <div style={styles.subtext}>
            Last 5: {recentForm.winRate}% WR
          </div>
        </div>
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
    gap: 16,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(255,255,255,0.06)",
  },
  subtext: {
    fontSize: 11,
    color: "#7e8fa6",
    marginTop: 4,
  },
};
