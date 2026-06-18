import type { RankedEntry } from "../../types";
import { hideOnError } from "../../utils/ddragon";

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
    <div style={styles.card}>
      {relevant.map((entry) => {
        const label = QUEUE_LABELS[entry.queueType] || entry.queueType;
        const total = entry.wins + entry.losses;
        const wr = total > 0 ? Math.round((entry.wins / total) * 100) : 0;

        return (
          <div key={entry.queueType} style={styles.badge}>
            <div style={styles.queueLabel}>{label}</div>
            <div style={styles.iconRow}>
              <img src={tierIconUrl(entry.tier)} alt={entry.tier} style={styles.tierIcon} onError={hideOnError} />
              <div>
                <div style={styles.tierRow}>
                  <span style={styles.tier}>
                    {formatTier(entry.tier)}{APEX_TIERS.has(entry.tier) ? "" : ` ${entry.rank}`}
                  </span>
                  <span style={styles.lp}>{entry.leaguePoints} LP</span>
                </div>
                <div style={styles.record}>{entry.wins}W {entry.losses}L &middot; {wr}%</div>
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
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  badge: {},
  queueLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#94a3b8",
    marginBottom: 6,
  },
  iconRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  tierIcon: { width: 40, height: 40 },
  tierRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  tier: {
    fontSize: 16,
    fontWeight: 700,
    color: "#f8fafc",
  },
  lp: {
    fontSize: 13,
    color: "#a5b4fc",
    fontWeight: 600,
  },
  record: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
};
