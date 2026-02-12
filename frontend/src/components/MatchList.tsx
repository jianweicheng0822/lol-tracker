import type { MatchSummary } from "../types";

type MatchListProps = {
  matches: MatchSummary[];
};

const championIconUrl = (name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${name}.png`;

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const timeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function MatchList({ matches }: MatchListProps) {
  if (matches.length === 0) return null;

  return (
    <div>
      <h3 style={{ margin: "0 0 14px 0", fontSize: 16 }}>
        Recent Matches
      </h3>
      <div style={styles.list}>
        {matches.map((m) => (
          <div
            key={m.matchId}
            style={{
              ...styles.row,
              borderLeft: `4px solid ${m.win ? "#22c55e" : "#ef4444"}`,
            }}
          >
            <div style={styles.champCell}>
              <img
                src={championIconUrl(m.championName)}
                width={40}
                height={40}
                style={styles.champIcon}
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
              <div style={styles.champName}>{m.championName}</div>
            </div>

            <div style={styles.kdaCell}>
              <div style={styles.kdaMain}>
                {m.kills} / <span style={{ color: "#ef4444" }}>{m.deaths}</span> / {m.assists}
              </div>
              <div style={styles.kdaRatio}>
                {m.deaths === 0 ? "Perfect" : ((m.kills + m.assists) / m.deaths).toFixed(2)} KDA
              </div>
            </div>

            <div style={styles.resultCell}>
              <span style={{
                ...styles.badge,
                background: m.win ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                color: m.win ? "#4ade80" : "#f87171",
              }}>
                {m.win ? "WIN" : "LOSS"}
              </span>
            </div>

            <div style={styles.metaCell}>
              <div>{formatDuration(m.gameDurationSec)}</div>
              <div style={styles.timeAgo}>{timeAgo(m.gameEndTimestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(30,41,59,0.35)",
    border: "1px solid rgba(148,163,184,0.1)",
  },
  champCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: 160,
    flexShrink: 0,
  },
  champIcon: {
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.18)",
  },
  champName: {
    fontWeight: 700,
    fontSize: 14,
  },
  kdaCell: {
    flex: 1,
    minWidth: 120,
  },
  kdaMain: {
    fontWeight: 700,
    fontSize: 15,
  },
  kdaRatio: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  resultCell: {
    width: 70,
    textAlign: "center",
    flexShrink: 0,
  },
  badge: {
    fontWeight: 800,
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  metaCell: {
    width: 90,
    textAlign: "right",
    fontSize: 13,
    flexShrink: 0,
  },
  timeAgo: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
};