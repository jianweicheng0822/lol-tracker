import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LiveGame, LiveGameParticipant } from "../types";
import { useDdragonVersion, ddragonBase, spellIconUrl, hideOnError } from "../utils/ddragon";
import { loadChampionMap, getChampionName } from "../utils/champion";
import { TIER_COLORS } from "../utils/lp";
import { COLORS, winRateColor } from "../utils/colors";

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

export default function LiveGameBanner({ game, region }: { game: LiveGame; region: string }) {
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const base = ddragonBase(version);
  const [championMap, setChampionMap] = useState<Record<number, string>>({});

  useEffect(() => {
    loadChampionMap(version).then(setChampionMap);
  }, [version]);

  const blueTeam = game.participants.filter(p => p.teamId === 100);
  const redTeam = game.participants.filter(p => p.teamId === 200);

  const getChampIconUrl = (championId: number): string => {
    const name = championMap[championId];
    if (!name) return "";
    // DDragon uses internal name (no spaces), but champion.json name may differ
    // We use the ID-based lookup from champion.json which gives us the proper name
    return `${base}/champion/${name.replace(/[^a-zA-Z]/g, "")}.png`;
  };

  return (
    <div style={styles.banner}>
      <div style={styles.header}>
        <div style={styles.liveIndicator}>
          <span style={styles.liveDot} />
          <span style={styles.liveText}>LIVE</span>
        </div>
        <span style={styles.gameInfo}>
          {game.gameMode} &middot; {formatGameDuration(game.gameStartTime, game.gameLength)}
        </span>
      </div>

      <div style={styles.teams}>
        <TeamColumn
          label="Blue Team"
          labelColor="#3A8FD6"
          participants={blueTeam}
          region={region}
          base={base}
          championMap={championMap}
          navigate={navigate}
        />
        <div style={styles.vs}>VS</div>
        <TeamColumn
          label="Red Team"
          labelColor="#E84057"
          participants={redTeam}
          region={region}
          base={base}
          championMap={championMap}
          navigate={navigate}
        />
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
  championMap: Record<number, string>;
  navigate: (path: string) => void;
}) {
  return (
    <div style={styles.teamCol}>
      <div style={{ ...styles.teamLabel, color: labelColor }}>{label}</div>
      {participants.map((p) => {
        const champName = championMap[p.championId] || `Champion ${p.championId}`;
        const champKey = champName.replace(/[^a-zA-Z]/g, "");
        return (
          <div key={p.puuid} style={styles.participantRow}>
            <img
              src={`${base}/champion/${champKey}.png`}
              alt={champName}
              style={styles.champIcon}
              onError={hideOnError}
            />
            <div style={styles.participantInfo}>
              <span
                style={styles.playerName}
                onClick={() => navigate(`/player/${region}/${encodeURIComponent(p.gameName)}/${encodeURIComponent(p.tagLine)}`)}
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
  banner: {
    background: COLORS.cardBg,
    border: `1px solid rgba(72,209,160,0.3)`,
    borderRadius: 10,
    padding: "16px 20px",
    marginBottom: 20,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
    background: "#48D1A0",
    boxShadow: "0 0 6px rgba(72,209,160,0.6)",
  },
  liveText: {
    fontSize: 13,
    fontWeight: 800,
    color: "#48D1A0",
    letterSpacing: 1,
  },
  gameInfo: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  teams: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
  },
  vs: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.textDim,
    alignSelf: "center",
    padding: "0 8px",
  },
  teamCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  participantRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
  },
  champIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  participantInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  playerName: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textPrimary,
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  champNameText: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  rankInfo: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  tierIcon: {
    width: 20,
    height: 20,
  },
  tierText: {
    fontSize: 12,
    fontWeight: 600,
  },
  wr: {
    fontSize: 11,
    fontWeight: 600,
  },
};
