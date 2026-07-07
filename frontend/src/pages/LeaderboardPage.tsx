/**
 * @file LeaderboardPage.tsx
 * @description Ranked leaderboard page displaying Challenger, Grandmaster, and Master tier players.
 * @module frontend.pages
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeaderboard } from "../api";
import { COLORS, winRateColor } from "../utils/colors";
import { TIER_COLORS } from "../utils/lp";
import type { LeaderboardEntry, Region } from "../types";
import { REGIONS } from "../types";

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

const PAGE_SIZE = 50;

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [region, setRegion] = useState<Region>("NA");
  const [queue, setQueue] = useState<Queue>("RANKED_SOLO_5x5");
  const [tier, setTier] = useState<Tier>("challenger");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Track which request key is active so stale responses are discarded
  const [fetchKey, setFetchKey] = useState(0);

  // Reset to page 0 and loading when filters change
  function changeRegion(r: Region) { setRegion(r); setPage(0); setStatus("loading"); setErrorMsg(""); setFetchKey((k) => k + 1); }
  function changeQueue(q: Queue) { setQueue(q); setPage(0); setStatus("loading"); setErrorMsg(""); setFetchKey((k) => k + 1); }
  function changeTier(t: Tier) { setTier(t); setPage(0); setStatus("loading"); setErrorMsg(""); setFetchKey((k) => k + 1); }
  function changePage(p: number) { setPage(p); setStatus("loading"); setFetchKey((k) => k + 1); }

  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  useEffect(() => {
    let active = true;
    fetchLeaderboard(region, queue, tier, page, PAGE_SIZE).then(
      (data: { entries: LeaderboardEntry[]; totalEntries: number }) => {
        if (active) { setEntries(data.entries); setTotalEntries(data.totalEntries); setStatus("done"); }
      },
      (e: unknown) => { if (active) { setStatus("error"); setErrorMsg(e instanceof Error ? e.message : "Something went wrong."); } },
    );
    return () => { active = false; };
  }, [fetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {REGIONS.map((r) => (
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
        <div style={styles.statusMsg}>Loading leaderboard...</div>
      )}
      {status === "error" && (
        <div style={{ ...styles.statusMsg, color: "#E84057" }}>
          <strong>Error:</strong> {errorMsg}
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
                    key={`${entry.summonerName}-${i}`}
                    style={styles.row}
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
    cursor: "default",
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
};
