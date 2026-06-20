import { useState } from "react";
import type { MatchSummary } from "../../types";
import { useDdragonVersion, ddragonBase, championIconUrl, hideOnError } from "../../utils/ddragon";
import { winRateColor, COLORS } from "../../utils/colors";

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
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

function ChampRow({ champ, imgBase }: { champ: ChampPerf; imgBase: string }) {
  const [hovered, setHovered] = useState(false);
  const wr = champ.games > 0 ? Math.round((champ.wins / champ.games) * 100) : 0;
  const kda = champ.deaths === 0
    ? (champ.kills + champ.assists).toFixed(1)
    : ((champ.kills + champ.assists) / champ.deaths).toFixed(2);
  const wrColor = winRateColor(wr);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "3px 6px",
        borderRadius: 4,
        background: hovered ? "rgba(255,255,255,0.04)" : undefined,
        transition: "background 0.15s",
      }}
    >
      <img
        src={championIconUrl(champ.championName, imgBase)}
        width={24}
        height={24}
        style={{ borderRadius: "50%", flexShrink: 0 }}
        onError={hideOnError}
      />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {champ.championName}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: wrColor, flexShrink: 0 }}>{wr}%</div>
      <div style={{ fontSize: 10, color: COLORS.textDim, flexShrink: 0 }}>{kda}</div>
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
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: COLORS.textDim,
    fontWeight: 500,
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
