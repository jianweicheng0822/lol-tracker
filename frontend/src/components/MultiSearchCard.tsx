import { useNavigate } from "react-router-dom";
import type { MultiSearchPlayer } from "../types";
import { useDdragonVersion, ddragonBase, hideOnError } from "../utils/ddragon";
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

export default function MultiSearchCard({ player, region }: { player: MultiSearchPlayer; region: string }) {
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const base = ddragonBase(version);

  if (player.error) {
    return (
      <div style={styles.card}>
        <div style={styles.errorContent}>
          <div style={styles.name}>{player.gameName}#{player.tagLine}</div>
          <div style={styles.errorText}>{player.error}</div>
        </div>
      </div>
    );
  }

  const soloEntry = player.rankedEntries?.find(e => e.queueType === "RANKED_SOLO_5x5");
  const flexEntry = player.rankedEntries?.find(e => e.queueType === "RANKED_FLEX_SR");

  const handleClick = () => {
    navigate(`/player/${region}/${encodeURIComponent(player.gameName)}/${encodeURIComponent(player.tagLine)}`);
  };

  return (
    <div
      style={styles.card}
      onClick={handleClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${COLORS.gold}60`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.cardBorder; }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
    >
      <div style={styles.header}>
        <img
          src={`${base}/profileicon/${player.profileIconId}.png`}
          alt="icon"
          style={styles.icon}
          onError={hideOnError}
        />
        <div>
          <div style={styles.name}>{player.gameName}</div>
          <div style={styles.tag}>#{player.tagLine}</div>
        </div>
      </div>

      <div style={styles.ranks}>
        {soloEntry ? <RankLine label="Solo/Duo" entry={soloEntry} /> : <RankLine label="Solo/Duo" />}
        {flexEntry ? <RankLine label="Flex" entry={flexEntry} /> : <RankLine label="Flex" />}
      </div>
    </div>
  );
}

function RankLine({ label, entry }: { label: string; entry?: { tier: string; rank: string; leaguePoints: number; wins: number; losses: number } }) {
  if (!entry) {
    return (
      <div style={styles.rankLine}>
        <span style={styles.queueLabel}>{label}</span>
        <span style={{ ...styles.tierText, opacity: 0.4 }}>Unranked</span>
      </div>
    );
  }

  const total = entry.wins + entry.losses;
  const wr = total > 0 ? Math.round((entry.wins / total) * 100) : 0;
  const tierColor = TIER_COLORS[entry.tier] || COLORS.textPrimary;

  return (
    <div style={styles.rankLine}>
      <img src={tierIconUrl(entry.tier)} alt={entry.tier} style={styles.tierIcon} onError={hideOnError} />
      <span style={styles.queueLabel}>{label}</span>
      <span style={{ ...styles.tierText, color: tierColor }}>
        {formatTier(entry.tier)}{APEX_TIERS.has(entry.tier) ? "" : ` ${entry.rank}`}
      </span>
      <span style={styles.lp}>{entry.leaguePoints} LP</span>
      <span style={{ ...styles.winRate, color: winRateColor(wr) }}>{wr}%</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 10,
    padding: "16px 20px",
    cursor: "pointer",
    transition: "border-color 0.15s ease",
  },
  errorContent: {
    opacity: 0.6,
  },
  errorText: {
    color: "#E84057",
    fontSize: 13,
    marginTop: 6,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.textPrimary,
  },
  tag: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  ranks: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  rankLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },
  tierIcon: {
    width: 24,
    height: 24,
  },
  queueLabel: {
    color: COLORS.textTertiary,
    width: 60,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierText: {
    fontWeight: 600,
    color: COLORS.textPrimary,
    minWidth: 90,
  },
  lp: {
    color: COLORS.gold,
    fontWeight: 600,
    fontSize: 12,
    minWidth: 50,
  },
  winRate: {
    fontWeight: 600,
    fontSize: 12,
  },
};
