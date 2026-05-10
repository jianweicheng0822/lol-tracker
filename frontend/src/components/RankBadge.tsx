/**
 * @file RankBadge.tsx
 * @description Render ranked queue badges (Solo/Duo, Flex) showing tier icon, division,
 *   LP, and win/loss record. Display an "Unranked" fallback when no entries exist.
 * @module frontend.components
 */
import type { RankedEntry } from "../types";
import { hideOnError } from "../utils/ddragon";

const QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: "Solo/Duo",
  RANKED_FLEX_SR: "Flex",
};

const TIER_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

const SVG_ONLY_TIERS = new Set(["EMERALD"]);

/**
 * Build the Community Dragon URL for a tier's ranked crest icon.
 *
 * @param tier - The uppercase tier name (e.g., "GOLD", "EMERALD").
 * @returns The full URL to the tier icon asset.
 */
function tierIconUrl(tier: string): string {
  const ext = SVG_ONLY_TIERS.has(tier.toUpperCase()) ? "svg" : "png";
  return `${TIER_ICON_BASE}/${tier.toLowerCase()}.${ext}`;
}

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

/**
 * Format a tier string to title case for display.
 *
 * @param tier - The uppercase tier name.
 * @returns Title-cased tier name (e.g., "Gold", "Platinum").
 */
function formatTier(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

/**
 * Render a single ranked queue badge with tier icon, rank, LP, and win/loss record.
 *
 * @param props - The ranked entry data for one queue.
 * @returns The queue badge element.
 */
function QueueBadge({ entry }: { entry: RankedEntry }) {
  const label = QUEUE_LABELS[entry.queueType] || entry.queueType;
  const totalGames = entry.wins + entry.losses;
  const winRate = totalGames > 0 ? Math.round((entry.wins / totalGames) * 100) : 0;

  return (
    <div style={styles.badge}>
      <div style={styles.queueLabel}>{label}</div>
      <div style={styles.iconRow}>
        <img
          src={tierIconUrl(entry.tier)}
          alt={entry.tier}
          style={styles.tierIcon}
          onError={hideOnError}
        />
        <div>
          <div style={styles.tierRow}>
            <span style={styles.tier}>{formatTier(entry.tier)}{APEX_TIERS.has(entry.tier) ? "" : ` ${entry.rank}`}</span>
            <span style={styles.lp}>{entry.leaguePoints} LP</span>
          </div>
          <div style={styles.record}>
            {entry.wins}W {entry.losses}L &middot; {winRate}%
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Render ranked badges for all relevant queue types, sorted with Solo/Duo first.
 * Display an "Unranked" placeholder when no ranked entries are available.
 *
 * @param props - The array of ranked entries from the Riot API.
 * @returns The ranked badge container element.
 */
export default function RankBadge({ entries }: { entries: RankedEntry[] }) {
  const relevant = entries.filter((e) => QUEUE_LABELS[e.queueType]);

  if (relevant.length === 0) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.badge, opacity: 0.5 }}>
          <div style={styles.queueLabel}>Ranked</div>
          <div style={styles.iconRow}>
            <img
              src={`${TIER_ICON_BASE}/unranked.png`}
              alt="Unranked"
              style={styles.tierIcon}
              onError={hideOnError}
            />
            <div style={styles.tier}>Unranked</div>
          </div>
        </div>
      </div>
    );
  }

  relevant.sort((a, b) => {
    if (a.queueType === "RANKED_SOLO_5x5") return -1;
    if (b.queueType === "RANKED_SOLO_5x5") return 1;
    return 0;
  });

  return (
    <div style={styles.container}>
      {relevant.map((entry) => (
        <QueueBadge key={entry.queueType} entry={entry} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },
  badge: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "12px 20px",
    minWidth: 180,
  },
  queueLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#94a3b8",
    marginBottom: 8,
  },
  iconRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  tierIcon: {
    width: 48,
    height: 48,
  },
  tierRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  tier: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f8fafc",
  },
  lp: {
    fontSize: 14,
    color: "#a5b4fc",
    fontWeight: 600,
  },
  record: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
};
