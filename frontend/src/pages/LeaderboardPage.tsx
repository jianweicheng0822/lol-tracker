/**
 * @file LeaderboardPage.tsx
 * @description Ranked leaderboard page displaying Challenger, Grandmaster, and Master tier players.
 * @module frontend.pages
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchLeaderboard } from "../api";
import { COLORS, winRateColor } from "../utils/colors";
import { TIER_COLORS } from "../utils/lp";
import { useDdragonVersion, ddragonBase } from "../utils/ddragon";
import type { LeaderboardEntry, Region } from "../types";

// Leaderboards cover the three major regions only (must match the backend's LEADERBOARD_REGIONS)
const LEADERBOARD_REGIONS: Region[] = ["NA", "EUW", "KR"];

const TIER_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

function tierIconUrl(tier: string): string {
  return `${TIER_ICON_BASE}/${tier.toLowerCase()}.png`;
}

const TIERS = ["challenger", "grandmaster", "master"] as const;
type Tier = (typeof TIERS)[number];

const TIER_LABELS: Record<Tier, string> = {
  challenger: "Challenger",
  grandmaster: "Grandmaster",
  master: "Master",
};

const QUEUES = [
  { value: "RANKED_SOLO_5x5", label: "Solo/Duo" },
  { value: "RANKED_FLEX_SR", label: "Flex" },
] as const;
type Queue = (typeof QUEUES)[number]["value"];

// Smaller pages mean fewer names/icons to resolve on a first visit (Riot rate limit)
const PAGE_SIZE = 25;

// The standard icon new accounts start with — shown while a player's real icon isn't resolved yet
const DEFAULT_PROFILE_ICON_ID = 29;

type LeaderboardView = { region: Region; queue: Queue; tier: Tier; page: number };

const DEFAULT_VIEW: LeaderboardView = { region: "NA", queue: "RANKED_SOLO_5x5", tier: "challenger", page: 0 };

/** Read the view from the URL; anything missing or invalid falls back to the default. */
function viewFromParams(params: URLSearchParams): LeaderboardView {
  const region = params.get("region") as Region;
  const queue = params.get("queue") as Queue;
  const tier = params.get("tier") as Tier;
  const page = Number(params.get("page")); // 1-based in the URL
  return {
    region: LEADERBOARD_REGIONS.includes(region) ? region : DEFAULT_VIEW.region,
    queue: QUEUES.some((q) => q.value === queue) ? queue : DEFAULT_VIEW.queue,
    tier: TIERS.includes(tier) ? tier : DEFAULT_VIEW.tier,
    page: Number.isInteger(page) && page >= 1 ? page - 1 : DEFAULT_VIEW.page,
  };
}

/** Only non-default values go in the URL, so the plain leaderboard stays at /leaderboard. */
function paramsFromView(view: LeaderboardView): Record<string, string> {
  const params: Record<string, string> = {};
  if (view.region !== DEFAULT_VIEW.region) params.region = view.region;
  if (view.queue !== DEFAULT_VIEW.queue) params.queue = view.queue;
  if (view.tier !== DEFAULT_VIEW.tier) params.tier = view.tier;
  if (view.page !== DEFAULT_VIEW.page) params.page = String(view.page + 1);
  return params;
}

type LoadedPage = { key: string; entries: LeaderboardEntry[]; totalEntries: number; error?: string };

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const ddragonVersion = useDdragonVersion();
  const profileIconUrl = (id: number) => `${ddragonBase(ddragonVersion)}/profileicon/${id}.png`;

  // The URL is the source of truth for what's shown, so links can be shared and refresh/Back keep it
  const [searchParams, setSearchParams] = useSearchParams();
  const { region, queue, tier, page } = viewFromParams(searchParams);
  const viewKey = `${region}|${queue}|${tier}|${page}`;

  const [loaded, setLoaded] = useState<LoadedPage | null>(null);
  // Loading whenever the data on hand isn't for the current view
  const status: "loading" | "error" | "done" =
    !loaded || loaded.key !== viewKey ? "loading" : loaded.error ? "error" : "done";
  const entries = status === "done" ? loaded!.entries : [];
  const errorMsg = loaded?.error ?? "";
  // Keep the last known total while the next page loads, so pagination doesn't jump around
  const totalEntries = loaded?.totalEntries ?? 0;

  // Replace rather than push, so Back doesn't step through every filter change
  const showView = (next: Partial<LeaderboardView>) =>
    setSearchParams(paramsFromView({ region, queue, tier, page, ...next }), { replace: true });
  // Changing a filter starts again from the first page
  const changeRegion = (r: Region) => showView({ region: r, page: 0 });
  const changeQueue = (q: Queue) => showView({ queue: q, page: 0 });
  const changeTier = (t: Tier) => showView({ tier: t, page: 0 });
  const changePage = (p: number) => showView({ page: p });

  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  // Retry re-runs the fetch for the same view: mark what we have as stale (shows loading) and refetch
  const [retryCount, setRetryCount] = useState(0);
  const retry = () => {
    setLoaded((prev) => (prev ? { ...prev, key: "" } : prev));
    setRetryCount((c) => c + 1);
  };

  useEffect(() => {
    let active = true;
    fetchLeaderboard(region, queue, tier, page, PAGE_SIZE).then(
      (data: { entries: LeaderboardEntry[]; totalEntries: number }) => {
        if (active) setLoaded({ key: viewKey, entries: data.entries, totalEntries: data.totalEntries });
      },
      (e: unknown) => {
        if (active) {
          setLoaded((prev) => ({
            key: viewKey,
            entries: [],
            totalEntries: prev?.totalEntries ?? 0,
            error: e instanceof Error ? e.message : "Something went wrong.",
          }));
        }
      },
    );
    return () => { active = false; };
  }, [region, queue, tier, page, viewKey, retryCount]);

  const tierColor = TIER_COLORS[tier.toUpperCase()] || COLORS.textPrimary;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate("/")} style={styles.backBtn}>
          &larr; Home
        </button>
        <h1 style={styles.title}>Leaderboard</h1>
      </div>

      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Region</label>
          <select
            value={region}
            onChange={(e) => changeRegion(e.target.value as Region)}
            style={styles.select}
          >
            {LEADERBOARD_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Queue</label>
          <select
            value={queue}
            onChange={(e) => changeQueue(e.target.value as Queue)}
            style={styles.select}
          >
            {QUEUES.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.tabs}>
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => changeTier(t)}
              style={{
                ...styles.tab,
                ...(tier === t
                  ? {
                      borderColor: TIER_COLORS[t.toUpperCase()] || COLORS.gold,
                      color: TIER_COLORS[t.toUpperCase()] || COLORS.gold,
                      background: `${TIER_COLORS[t.toUpperCase()] || COLORS.gold}15`,
                    }
                  : {}),
              }}
            >
              <img
                src={tierIconUrl(t)}
                alt={t}
                style={styles.tabIcon}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {TIER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>#</th>
                <th style={styles.th}>Player</th>
                <th style={{ ...styles.th, width: 140, textAlign: "center" }}>LP</th>
                <th style={{ ...styles.th, width: 100, textAlign: "center" }}>Win Rate</th>
                <th style={{ ...styles.th, width: 120, textAlign: "center" }}>W / L</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={styles.skeleton} />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...styles.skeletonCircle }} />
                      <div style={{ ...styles.skeleton, width: "60%" }} />
                    </div>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={{ ...styles.skeleton, width: "50%", margin: "0 auto" }} />
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={{ ...styles.skeleton, width: "40%", margin: "0 auto" }} />
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={{ ...styles.skeleton, width: "50%", margin: "0 auto" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === "error" && (
        <div style={styles.errorBox}>
          <div><strong>Error:</strong> {errorMsg}</div>
          <button
            style={styles.retryBtn}
            onClick={retry}
          >
            Retry
          </button>
        </div>
      )}
      {status === "done" && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>#</th>
                <th style={styles.th}>Player</th>
                <th style={{ ...styles.th, width: 140, textAlign: "center" }}>
                  LP
                </th>
                <th style={{ ...styles.th, width: 100, textAlign: "center" }}>
                  Win Rate
                </th>
                <th style={{ ...styles.th, width: 120, textAlign: "center" }}>
                  W / L
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const wr = entry.winRate;
                const globalRank = page * PAGE_SIZE + i + 1;
                return (
                  <tr
                    key={`${entry.puuid || entry.summonerName}-${i}`}
                    style={styles.row}
                    onClick={() => {
                      if (entry.puuid) navigate(`/player/puuid/${region}/${encodeURIComponent(entry.puuid)}`);
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "transparent";
                    }}
                  >
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        fontWeight: globalRank <= 3 ? 700 : 400,
                        color: globalRank <= 3 ? COLORS.gold : COLORS.textSecondary,
                      }}
                    >
                      {globalRank}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.playerCell}>
                        <img
                          src={profileIconUrl(entry.profileIconId || DEFAULT_PROFILE_ICON_ID)}
                          alt=""
                          loading="lazy"
                          style={styles.profileIcon}
                          onError={(e) => {
                            // Fall back to the default icon (keeps rows aligned); stop if that fails too
                            const img = e.target as HTMLImageElement;
                            const fallback = profileIconUrl(DEFAULT_PROFILE_ICON_ID);
                            if (img.src !== fallback) img.src = fallback;
                          }}
                        />
                        <img
                          src={tierIconUrl(entry.tier)}
                          alt={entry.tier}
                          style={styles.tierIcon}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                          {entry.summonerName}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: tierColor,
                        fontWeight: 600,
                      }}
                    >
                      {entry.leaguePoints.toLocaleString()} LP
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: winRateColor(wr),
                        fontWeight: 600,
                      }}
                    >
                      {wr}%
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: COLORS.textSecondary,
                      }}
                    >
                      {entry.wins}W {entry.losses}L
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length === 0 && (
            <div style={styles.statusMsg}>No entries found.</div>
          )}
        </div>
      )}
      {status === "done" && totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => changePage(page - 1)}
            disabled={page === 0}
            style={{ ...styles.pageBtn, ...(page === 0 ? styles.pageBtnDisabled : {}) }}
          >
            &larr; Prev
          </button>
          <span style={styles.pageInfo}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => changePage(page + 1)}
            disabled={page >= totalPages - 1}
            style={{ ...styles.pageBtn, ...(page >= totalPages - 1 ? styles.pageBtnDisabled : {}) }}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: COLORS.pageBg,
    color: COLORS.textPrimary,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    padding: "24px 20px 60px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    maxWidth: 900,
    marginBottom: 24,
  },
  backBtn: {
    background: "transparent",
    border: `1px solid ${COLORS.cardBorder}`,
    color: COLORS.textSecondary,
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    width: "100%",
    maxWidth: 900,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  controlLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: 600,
  },
  select: {
    background: COLORS.cardBg,
    color: COLORS.textPrimary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
  },
  tabs: {
    display: "flex",
    gap: 8,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: `1px solid ${COLORS.cardBorder}`,
    color: COLORS.textSecondary,
    borderRadius: 8,
    padding: "6px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    transition: "all 0.15s ease",
  },
  tabIcon: {
    width: 20,
    height: 20,
  },
  statusMsg: {
    textAlign: "center",
    color: COLORS.textTertiary,
    padding: "40px 0",
    fontSize: 15,
  },
  tableWrapper: {
    width: "100%",
    maxWidth: 900,
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: `1px solid ${COLORS.divider}`,
  },
  row: {
    transition: "background 0.1s ease",
    cursor: "pointer",
  },
  td: {
    padding: "10px 16px",
    fontSize: 14,
    borderBottom: `1px solid ${COLORS.divider}`,
  },
  playerCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    objectFit: "cover" as const,
  },
  tierIcon: {
    width: 24,
    height: 24,
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    width: "100%",
    maxWidth: 900,
  },
  pageBtn: {
    background: COLORS.cardBg,
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: "8px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  pageBtnDisabled: {
    opacity: 0.35,
    cursor: "default",
  },
  pageInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: 600,
  },
  skeleton: {
    height: 14,
    width: "30%",
    borderRadius: 4,
    background: `linear-gradient(90deg, ${COLORS.cardBorder} 25%, rgba(255,255,255,0.06) 50%, ${COLORS.cardBorder} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    flexShrink: 0,
    background: `linear-gradient(90deg, ${COLORS.cardBorder} 25%, rgba(255,255,255,0.06) 50%, ${COLORS.cardBorder} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
  errorBox: {
    textAlign: "center" as const,
    color: "#E84057",
    padding: "40px 0",
    fontSize: 15,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 12,
  },
  retryBtn: {
    background: "transparent",
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: "8px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
};
