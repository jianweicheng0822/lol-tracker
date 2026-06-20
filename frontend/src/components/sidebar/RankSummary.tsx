import type { RankedEntry } from "../../types";
import { hideOnError } from "../../utils/ddragon";
import { TIER_TINTS, TIER_COLORS } from "../../utils/lp";
import { winRateColor, COLORS } from "../../utils/colors";

const QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: "Solo/Duo",
  RANKED_FLEX_SR: "Flex",
};

const TIER_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

const SVG_ONLY_TIERS = new Set(["EMERALD"]);

function tierIconUrl(tier: string): string {
  const ext = SVG_ONLY_TIERS.has(tier.toUpperCase()) ? "svg" : "png";
  return `${TIER_ICON_BASE}/${tier.toLowerCase()}.${ext}`;
}

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function formatTier(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

type Props = { entries: RankedEntry[] };

export default function RankSummary({ entries }: Props) {
  const relevant = entries
    .filter((e) => QUEUE_LABELS[e.queueType])
    .sort((a, b) => (a.queueType === "RANKED_SOLO_5x5" ? -1 : b.queueType === "RANKED_SOLO_5x5" ? 1 : 0));

  if (relevant.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.badge}>
          <div style={styles.queueLabel}>Ranked</div>
          <div style={styles.iconRow}>
            <img src={`${TIER_ICON_BASE}/unranked.png`} alt="Unranked" style={styles.tierIcon} onError={hideOnError} />
            <div style={styles.tier}>Unranked</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.card,
      background: TIER_TINTS[relevant[0].tier] || styles.card.background,
    }}>
      {relevant.map((entry) => {
        const label = QUEUE_LABELS[entry.queueType] || entry.queueType;
        const total = entry.wins + entry.losses;
        const wr = total > 0 ? Math.round((entry.wins / total) * 100) : 0;
        const tierColor = TIER_COLORS[entry.tier] || COLORS.textPrimary;

        return (
          <div key={entry.queueType} style={styles.badge}>
            <div style={styles.queueLabel}>{label}</div>
            <div style={styles.iconRow}>
              <img src={tierIconUrl(entry.tier)} alt={entry.tier} style={styles.tierIcon} onError={hideOnError} />
              <div>
                <div style={styles.tierRow}>
                  <span style={{ ...styles.tier, color: tierColor }}>
                    {formatTier(entry.tier)}{APEX_TIERS.has(entry.tier) ? "" : ` ${entry.rank}`}
                  </span>
                  <span style={styles.lp}>{entry.leaguePoints} LP</span>
                </div>
                <div style={styles.record}>
                  {entry.wins}W {entry.losses}L &middot;{" "}
                  <span style={{ color: winRateColor(wr) }}>{wr}%</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: 20,
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  badge: {},
  queueLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.textTertiary,
    marginBottom: 8,
  },
  iconRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  tierIcon: { width: 56, height: 56 },
  tierRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  tier: {
    fontSize: 20,
    fontWeight: 800,
    color: COLORS.textPrimary,
  },
  lp: {
    fontSize: 16,
    color: "#D4A017",
    fontWeight: 700,
  },
  record: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 3,
  },
};
