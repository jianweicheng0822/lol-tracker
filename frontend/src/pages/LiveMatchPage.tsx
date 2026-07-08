import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { LiveGame, LiveGameParticipant } from "../types";
import type { Champion } from "../utils/champion";
import { fetchAccount, fetchLiveGame } from "../api";
import { useDdragonVersion, ddragonBase, hideOnError, QUEUE_NAMES } from "../utils/ddragon";
import { loadChampionMap } from "../utils/champion";
import { COLORS, winRateColor } from "../utils/colors";
import { TIER_COLORS } from "../utils/lp";

const TIER_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";
const SVG_ONLY_TIERS = new Set(["EMERALD"]);
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function tierIconUrl(tier: string): string {
  const ext = SVG_ONLY_TIERS.has(tier.toUpperCase()) ? "svg" : "png";
  return `${TIER_ICON_BASE}/${tier.toLowerCase()}.${ext}`;
}

function formatTier(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function formatGameDuration(startTime: number, gameLength: number): string {
  const elapsed = gameLength > 0
    ? gameLength
    : Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LiveMatchPage() {
  const { region, gameName, tag } = useParams<{ region: string; gameName: string; tag: string }>();
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const base = ddragonBase(version);

  const [game, setGame] = useState<LiveGame | null>(null);
  const [championMap, setChampionMap] = useState<Record<number, Champion>>({});
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadChampionMap(version).then(setChampionMap);
  }, [version]);

  const load = useCallback(async (cancelled = { current: false }) => {
    if (!region || !gameName || !tag) return;
    try {
      const acc = await fetchAccount(decodeURIComponent(gameName), decodeURIComponent(tag), region);
      const liveData = await fetchLiveGame(acc.puuid, region);
      if (cancelled.current) return;
      if (!liveData) {
        setStatus("error");
        setErrorMsg("This player is not currently in a game.");
        return;
      }
      setGame(liveData);
      setStatus("done");
    } catch (e) {
      if (cancelled.current) return;
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to load live game data.");
    }
  }, [region, gameName, tag]);

  useEffect(() => {
    const cancelled = { current: false };
    load(cancelled);
    return () => { cancelled.current = true; };
  }, [load]);

  const blueTeam = game?.participants.filter((p) => p.teamId === 100) || [];
  const redTeam = game?.participants.filter((p) => p.teamId === 200) || [];
  const queueName = game ? (QUEUE_NAMES[game.queueId] || game.gameMode) : "";

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <span style={styles.logo} onClick={() => navigate("/")}>LoL Tracker</span>
      </div>

      <div style={styles.content}>
        {status === "loading" && (
          <div style={styles.loadingBox}>Loading live game...</div>
        )}

        {status === "error" && (
          <div style={styles.errorBox}>
            <p>{errorMsg}</p>
            <button
              style={styles.backBtn}
              onClick={() => navigate(`/player/${region}/${gameName}/${tag}`)}
            >
              Back to Profile
            </button>
          </div>
        )}

        {status === "done" && game && (
          <>
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

            <div style={styles.teamsGrid}>
              <TeamColumn
                label="Blue Team"
                labelColor="#3A8FD6"
                participants={blueTeam}
                region={region!}
                base={base}
                championMap={championMap}
                navigate={navigate}
              />
              <TeamColumn
                label="Red Team"
                labelColor="#E84057"
                participants={redTeam}
                region={region!}
                base={base}
                championMap={championMap}
                navigate={navigate}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TeamColumn({
  label,
  labelColor,
  participants,
  region,
  base,
  championMap,
  navigate,
}: {
  label: string;
  labelColor: string;
  participants: LiveGameParticipant[];
  region: string;
  base: string;
  championMap: Record<number, Champion>;
  navigate: (path: string) => void;
}) {
  return (
    <div style={styles.teamCol}>
      <div style={{ ...styles.teamLabel, color: labelColor }}>{label}</div>
      {participants.map((p) => {
        const champ = championMap[p.championId];
        const champId = champ?.id || "Unknown";
        const champName = champ?.name || `Champion ${p.championId}`;
        return (
          <div key={p.puuid} style={styles.participantRow}>
            <img
              src={`${base}/champion/${champId}.png`}
              alt={champName}
              style={styles.champIcon}
              onError={hideOnError}
            />
            <div style={styles.participantInfo}>
              <span
                style={styles.playerName}
                onClick={() =>
                  navigate(`/player/${region}/${encodeURIComponent(p.gameName)}/${encodeURIComponent(p.tagLine)}`)
                }
                role="link"
              >
                {p.gameName}
              </span>
              <span style={styles.champNameText}>{champName}</span>
            </div>
            <div style={styles.rankInfo}>
              {p.tier ? (
                <>
                  <img src={tierIconUrl(p.tier)} alt={p.tier} style={styles.tierIcon} onError={hideOnError} />
                  <span style={{ ...styles.tierText, color: TIER_COLORS[p.tier] || COLORS.textPrimary }}>
                    {formatTier(p.tier)}{APEX_TIERS.has(p.tier) ? "" : ` ${p.rank}`}
                  </span>
                  <span style={styles.lp}>{p.leaguePoints} LP</span>
                  <span style={{ ...styles.wr, color: winRateColor(p.winRate) }}>{p.winRate}%</span>
                </>
              ) : (
                <span style={{ ...styles.tierText, opacity: 0.4 }}>Unranked</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#121210",
    color: COLORS.textPrimary,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    padding: "12px 24px",
    background: "#111110",
    borderBottom: "1px solid #1e1c18",
  },
  logo: {
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  content: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "30px 20px",
  },
  loadingBox: {
    textAlign: "center",
    padding: 40,
    opacity: 0.6,
    fontSize: 16,
  },
  errorBox: {
    background: "#2d1111",
    color: "#E88A8A",
    padding: 20,
    borderRadius: 8,
    textAlign: "center",
  },
  backBtn: {
    marginTop: 12,
    background: "transparent",
    color: COLORS.textTertiary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: "8px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#E84057",
    boxShadow: "0 0 8px rgba(232,64,87,0.6)",
  },
  liveText: {
    fontSize: 15,
    fontWeight: 800,
    color: "#E84057",
    letterSpacing: 1,
  },
  queueName: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.textPrimary,
  },
  elapsed: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  teamsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
  },
  teamCol: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 10,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  participantRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 0",
  },
  champIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  participantInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  playerName: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.textPrimary,
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  champNameText: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  rankInfo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  tierIcon: {
    width: 22,
    height: 22,
  },
  tierText: {
    fontSize: 13,
    fontWeight: 600,
  },
  lp: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  wr: {
    fontSize: 12,
    fontWeight: 600,
  },
};
