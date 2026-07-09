import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LiveGame } from "../types";
import type { Champion } from "../utils/champion";
import { useDdragonVersion, ddragonBase, QUEUE_NAMES, championIconOnError } from "../utils/ddragon";
import { loadChampionMap } from "../utils/champion";
import { COLORS } from "../utils/colors";

function formatGameDuration(startTime: number, gameLength: number): string {
  const elapsed = gameLength > 0
    ? gameLength
    : Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LiveGameCard({
  game,
  region,
  gameName,
  tag,
  onCheckAgain,
  isChecking = false,
}: {
  game: LiveGame | null;
  region: string;
  gameName: string;
  tag: string;
  onCheckAgain: () => void;
  isChecking?: boolean;
}) {
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const base = ddragonBase(version);
  const [championMap, setChampionMap] = useState<Record<number, Champion>>({});

  useEffect(() => {
    loadChampionMap(version).then(setChampionMap);
  }, [version]);

  if (!game) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.title}>Live Game</span>
        </div>
        <p style={styles.notInGame}>Not currently in a game</p>
        <button
          style={{ ...styles.checkBtn, ...(isChecking ? { opacity: 0.6, cursor: "default" } : {}) }}
          onClick={isChecking ? undefined : onCheckAgain}
          disabled={isChecking}
        >
          {isChecking ? "Checking..." : "Check Again"}
        </button>
      </div>
    );
  }

  const queueName = QUEUE_NAMES[game.queueId] || game.gameMode;
  const blueTeam = game.participants.filter((p) => p.teamId === 100);
  const redTeam = game.participants.filter((p) => p.teamId === 200);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.liveIndicator}>
          <span style={styles.liveDot} />
          <span style={styles.liveText}>LIVE</span>
        </div>
        <span style={styles.queueName}>{queueName}</span>
        <span style={styles.elapsed}>
          {formatGameDuration(game.gameStartTime, game.gameLength)}
        </span>
      </div>

      <div style={styles.teams}>
        <TeamIcons participants={blueTeam} base={base} championMap={championMap} color="#3A8FD6" label="Blue" />
        <span style={styles.vs}>VS</span>
        <TeamIcons participants={redTeam} base={base} championMap={championMap} color="#E84057" label="Red" />
      </div>

      <button
        style={styles.viewBtn}
        onClick={() =>
          navigate(`/live/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tag)}`)
        }
      >
        View Live Match
      </button>
    </div>
  );
}

function TeamIcons({
  participants,
  base,
  championMap,
  color,
  label,
}: {
  participants: { championId: number }[];
  base: string;
  championMap: Record<number, Champion>;
  color: string;
  label: string;
}) {
  return (
    <div style={styles.teamIcons}>
      <span style={{ ...styles.teamLabel, color }}>{label}</span>
      <div style={styles.iconRow}>
        {participants.map((p, i) => {
          const champ = championMap[p.championId];
          const champId = champ?.id || "Unknown";
          const champName = champ?.name || `Champion ${p.championId}`;
          return (
            <img
              key={i}
              src={`${base}/champion/${champId}.png`}
              alt={champName}
              title={champName}
              style={styles.champIcon}
              onError={championIconOnError(champId)}
            />
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 10,
    padding: "16px 20px",
    marginBottom: 20,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.textSecondary,
  },
  notInGame: {
    fontSize: 13,
    color: COLORS.textDim,
    margin: "4px 0 12px",
  },
  checkBtn: {
    background: "transparent",
    color: COLORS.textTertiary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#E84057",
    boxShadow: "0 0 6px rgba(232,64,87,0.6)",
  },
  liveText: {
    fontSize: 13,
    fontWeight: 800,
    color: "#E84057",
    letterSpacing: 1,
  },
  queueName: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textPrimary,
  },
  elapsed: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  teams: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  vs: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.textDim,
  },
  teamIcons: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  iconRow: {
    display: "flex",
    gap: 4,
  },
  champIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  viewBtn: {
    background: "rgba(72,209,160,0.15)",
    color: "#48D1A0",
    border: "1px solid rgba(72,209,160,0.3)",
    borderRadius: 6,
    padding: "8px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
};
