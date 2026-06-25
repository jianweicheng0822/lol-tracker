import { useState } from "react";
import type { MatchSummary } from "../../types";
import { useDdragonVersion, ddragonBase, championIconUrl, hideOnError } from "../../utils/ddragon";
import { COLORS } from "../../utils/colors";

type ChampPerf = {
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
};

function aggregateChampions(matches: MatchSummary[]): ChampPerf[] {
  const map = new Map<string, ChampPerf>();
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
    .slice(0, 5);
}

type Props = {
  matches: MatchSummary[];
  onViewAll: () => void;
};

export default function TopChampionsPreview({ matches, onViewAll }: Props) {
  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion);
  const champs = aggregateChampions(matches);

  if (champs.length === 0) return null;

  return (
    <div style={styles.card}>
      <div style={styles.title}>Top Champions</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {champs.map((c) => (
          <ChampRow key={c.championName} champ={c} imgBase={imgBase} />
        ))}
      </div>
      <button style={styles.viewAll} onClick={onViewAll}>
        View all &rarr;
      </button>
    </div>
  );
}

function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return null;
  const winPct = (wins / total) * 100;

  return (
    <div style={{
      display: "flex",
      width: "100%",
      height: 16,
      borderRadius: 3,
      overflow: "hidden",
      fontSize: 10,
      fontWeight: 600,
      lineHeight: "16px",
    }}>
      <div style={{
        width: `${winPct}%`,
        minWidth: wins > 0 ? 20 : 0,
        background: "rgba(72,209,160,0.25)",
        color: "#48D1A0",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}>
        {wins}W
      </div>
      <div style={{
        width: `${100 - winPct}%`,
        minWidth: losses > 0 ? 20 : 0,
        background: "rgba(232,64,87,0.25)",
        color: "#E84057",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}>
        {losses}L
      </div>
    </div>
  );
}

function ChampRow({ champ, imgBase }: { champ: ChampPerf; imgBase: string }) {
  const [hovered, setHovered] = useState(false);
  const wr = champ.games > 0 ? Math.round((champ.wins / champ.games) * 100) : 0;
  const losses = champ.games - champ.wins;
  const g = champ.games || 1;
  const avgK = (champ.kills / g).toFixed(1);
  const avgD = (champ.deaths / g).toFixed(1);
  const avgA = (champ.assists / g).toFixed(1);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 6px",
        borderRadius: 4,
        background: hovered ? "rgba(255,255,255,0.04)" : undefined,
        transition: "background 0.15s",
      }}
    >
      <img
        src={championIconUrl(champ.championName, imgBase)}
        width={28}
        height={28}
        style={{ borderRadius: "50%", flexShrink: 0 }}
        onError={hideOnError}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {champ.championName}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>
            <span style={{ color: COLORS.textDim }}>{wr}%</span>
            <span style={{ color: COLORS.textDim }}> &middot; </span>
            <span style={{ color: COLORS.textSecondary }}>{avgK}</span>
            <span style={{ color: COLORS.textDim }}>/</span>
            <span style={{ color: "#E84057" }}>{avgD}</span>
            <span style={{ color: COLORS.textDim }}>/</span>
            <span style={{ color: COLORS.textSecondary }}>{avgA}</span>
          </span>
        </div>
        <WinLossBar wins={champ.wins} losses={losses} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  viewAll: {
    background: "none",
    border: "none",
    color: "#D4A017",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    padding: "6px 0 0",
    display: "block",
    width: "100%",
    textAlign: "right",
  },
};
