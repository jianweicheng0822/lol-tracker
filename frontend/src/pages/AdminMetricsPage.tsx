/**
 * @file AdminMetricsPage.tsx
 * @description Admin-only usage metrics: who visits, what they use, where they come from.
 * @module frontend.pages
 */
import { useEffect, useState } from "react";
import {
  AuthRequiredError,
  NotAdminError,
  fetchAdminMetrics,
  type MetricsCount,
  type MetricsReport,
} from "../api";
import { COLORS } from "../utils/colors";
import AppHeader from "../components/AppHeader";
import NotFoundPage from "./NotFoundPage";
import { useAuth } from "../hooks/useAuth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type State =
  | { kind: "loading" }
  | { kind: "notAdmin" }
  | { kind: "error"; message: string }
  | { kind: "ready"; report: MetricsReport };

const RANGES = [7, 14, 30, 90] as const;

/** Chart colors, validated for color-blind separation on the dark surface. */
const RETURNING_COLOR = "#B8892F";
const NEW_COLOR = "#0AA89B";

const EVENT_LABELS: Record<string, string> = {
  player_view: "Opened a player",
  match_detail: "Opened a match",
  live_game: "Live game",
  leaderboard: "Leaderboard",
  multi_search: "Multi-search",
  ai_analysis: "AI analysis",
  signup: "Signed up",
  login: "Logged in",
  login_oauth: "Logged in (OAuth)",
  favorite_add: "Added a favorite",
  checkout_start: "Started PRO checkout",
  feedback: "Sent feedback",
  page_view: "Page view",
  referral: "Arrived from",
};

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  player: "Player",
  match: "Match detail",
  live: "Live game",
  leaderboard: "Leaderboard",
  multi_search: "Multi-search",
  checkout: "Checkout",
  not_found: "Not found",
};

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

export default function AdminMetricsPage() {
  const { isLoggedIn } = useAuth();
  const [days, setDays] = useState<number>(14);
  const [state, setState] = useState<State>({ kind: "loading" });
  useDocumentTitle(state.kind === "ready" || state.kind === "error" ? "Usage" : null);

  useEffect(() => {
    let active = true;
    fetchAdminMetrics(days)
      .then((report) => active && setState({ kind: "ready", report }))
      .catch((err) => {
        if (!active) return;
        if (err instanceof NotAdminError || err instanceof AuthRequiredError) setState({ kind: "notAdmin" });
        else setState({ kind: "error", message: err instanceof Error ? err.message : "Could not load metrics." });
      });
    return () => { active = false; };
  }, [isLoggedIn, days]);

  if (state.kind === "notAdmin") return <NotFoundPage />;
  if (state.kind === "loading") return <div style={styles.page} />;

  return (
    <div style={styles.page}>
      <AppHeader />
      <div style={styles.body}>
        <div style={styles.inner}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>Usage</h1>
            <div style={styles.tabs} role="tablist" aria-label="Date range">
              {RANGES.map((r) => (
                <button
                  key={r}
                  role="tab"
                  aria-selected={days === r}
                  onClick={() => setDays(r)}
                  style={{ ...styles.tab, ...(days === r ? styles.tabActive : {}) }}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>

          {state.kind === "error" && <p role="alert" style={{ color: COLORS.loss }}>{state.message}</p>}
          {state.kind === "ready" && <Report report={state.report} />}
        </div>
      </div>
    </div>
  );
}

function Report({ report }: { report: MetricsReport }) {
  const t = report.totals;
  return (
    <>
      <p style={styles.muted}>
        {shortDate(report.from)} – {shortDate(report.to)} · days in {report.zone} · admin visits excluded
      </p>

      <div style={styles.tiles}>
        <Tile label="Visitors" value={t.visitors} />
        <Tile label="New" value={t.newVisitors} />
        <Tile label="Returning" value={t.returningVisitors} hint="came on 2+ days" />
        <Tile label="Page views" value={t.pageViews} />
        <Tile label="Feature uses" value={t.actions} />
        <Tile label="Signups" value={t.signups} />
      </div>

      <section style={styles.card}>
        <h2 style={styles.h2}>Visitors per day</h2>
        <DailyChart daily={report.daily} />
      </section>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.h2}>What they did</h2>
          <CountTable rows={report.features} labels={EVENT_LABELS} empty="No feature use yet." />
        </section>
        <section style={styles.card}>
          <h2 style={styles.h2}>Pages</h2>
          <CountTable rows={report.pages} labels={PAGE_LABELS} empty="No page views yet." />
        </section>
        <section style={styles.card}>
          <h2 style={styles.h2}>Came from</h2>
          <CountTable rows={report.referrers} empty="No outside referrers yet (direct visits don't count here)." />
        </section>
      </div>

      <section style={styles.card}>
        <h2 style={styles.h2}>Recent activity</h2>
        {report.recent.length === 0 ? (
          <p style={styles.muted}>Nothing yet.</p>
        ) : (
          <div style={styles.recentList}>
            {report.recent.map((e, i) => (
              <div key={i} style={styles.recentRow}>
                <time dateTime={e.at} style={styles.recentTime}>
                  {new Date(e.at).toLocaleString([], { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </time>
                <span style={styles.visitorChip} title="Visitor id (shortened)">{e.visitor}</span>
                <span style={styles.recentEvent}>
                  {EVENT_LABELS[e.event] ?? e.event}
                  {e.detail && <span style={styles.recentDetail}> · {PAGE_LABELS[e.detail] ?? e.detail}</span>}
                </span>
                {e.username && <span style={styles.recentUser}>{e.username}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div style={styles.tile}>
      <div style={styles.tileLabel}>{label}</div>
      <div style={styles.tileValue}>{value.toLocaleString()}</div>
      {hint && <div style={styles.tileHint}>{hint}</div>}
    </div>
  );
}

function DailyChart({ daily }: { daily: MetricsReport["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.visitors));
  const height = 160;
  const labelEvery = Math.max(1, Math.ceil(daily.length / 7));
  const h = hover !== null ? daily[hover] : null;

  return (
    <div>
      <div style={styles.legend}>
        <span style={styles.legendItem}><span style={{ ...styles.swatch, background: RETURNING_COLOR }} />Returning</span>
        <span style={styles.legendItem}><span style={{ ...styles.swatch, background: NEW_COLOR }} />New</span>
        <span style={styles.legendHint}>
          {h ? `${shortDate(h.date)}: ${h.visitors} visitors (${h.newVisitors} new) · ${h.pageViews} page views · ${h.actions} feature uses`
            : "Hover a day for details"}
        </span>
      </div>
      <div style={{ position: "relative", height, marginTop: 8 }} onMouseLeave={() => setHover(null)}>
        <div style={styles.gridLine}><span style={styles.axisLabel}>{max}</span></div>
        <div style={{ ...styles.gridLine, top: "50%" }}><span style={styles.axisLabel}>{Math.round(max / 2)}</span></div>
        <div style={styles.bars} role="img" aria-label="Visitors per day, new and returning">
          {daily.map((d, i) => {
            const returning = d.visitors - d.newVisitors;
            const total = (d.visitors / max) * 100;
            return (
              <div
                key={d.date}
                style={{ ...styles.barCol, background: hover === i ? "rgba(240,230,210,0.06)" : "transparent" }}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${d.date}: ${d.visitors} visitors, ${d.newVisitors} new`}
              >
                <div style={{ ...styles.barStack, height: `${total}%` }}>
                  {d.newVisitors > 0 && (
                    <div style={{ flex: d.newVisitors, background: NEW_COLOR, borderRadius: "4px 4px 0 0" }} />
                  )}
                  {returning > 0 && (
                    <div style={{
                      flex: returning,
                      background: RETURNING_COLOR,
                      borderRadius: d.newVisitors > 0 ? 0 : "4px 4px 0 0",
                      marginTop: d.newVisitors > 0 ? 2 : 0,
                    }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={styles.xLabels}>
        {daily.map((d, i) => (
          <span key={d.date} style={styles.xLabel}>
            {i % labelEvery === 0 || i === daily.length - 1 ? shortDate(d.date) : ""}
          </span>
        ))}
      </div>
      <details style={styles.details}>
        <summary style={styles.summary}>Show as table</summary>
        <table style={styles.table}>
          <thead>
            <tr><th style={styles.th}>Day</th><th style={styles.thNum}>Visitors</th><th style={styles.thNum}>New</th><th style={styles.thNum}>Page views</th><th style={styles.thNum}>Feature uses</th></tr>
          </thead>
          <tbody>
            {[...daily].reverse().map((d) => (
              <tr key={d.date}>
                <td style={styles.td}>{d.date}</td>
                <td style={styles.tdNum}>{d.visitors}</td>
                <td style={styles.tdNum}>{d.newVisitors}</td>
                <td style={styles.tdNum}>{d.pageViews}</td>
                <td style={styles.tdNum}>{d.actions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function CountTable({ rows, labels, empty }: { rows: MetricsCount[]; labels?: Record<string, string>; empty: string }) {
  if (rows.length === 0) return <p style={styles.muted}>{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={styles.countList}>
      {rows.map((r) => (
        <div key={r.name} style={styles.countRow} title={`${r.count} times by ${r.visitors} visitor${r.visitors === 1 ? "" : "s"}`}>
          <div style={styles.countTop}>
            <span style={styles.countName}>{labels?.[r.name] ?? r.name}</span>
            <span style={styles.countValue}>{r.count}</span>
            <span style={styles.countVisitors}>{r.visitors} {r.visitors === 1 ? "visitor" : "visitors"}</span>
          </div>
          <div style={styles.countTrack}>
            <div style={{ ...styles.countBar, width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", color: COLORS.textPrimary },
  body: { padding: "24px 16px 80px", display: "flex", justifyContent: "center" },
  inner: { width: "100%", maxWidth: 1000, minWidth: 0 },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  title: { fontSize: 28, fontWeight: 700, margin: 0 },
  muted: { color: COLORS.textTertiary, fontSize: 13, margin: "8px 0 16px" },
  tabs: { display: "flex", gap: 6 },
  tab: {
    padding: "6px 12px",
    borderRadius: 3,
    border: `1px solid ${COLORS.cardBorder}`,
    background: "transparent",
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: { borderColor: COLORS.gold, color: COLORS.gold, background: "rgba(200,155,60,0.1)" },
  tiles: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 },
  tile: { background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 6, padding: "12px 14px" },
  tileLabel: { fontSize: 12, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.6 },
  tileValue: { fontSize: 28, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums" },
  tileHint: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    minWidth: 0,
  },
  h2: { fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: COLORS.textPrimary },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  legend: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12, color: COLORS.textSecondary },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6 },
  legendHint: { marginLeft: "auto", color: COLORS.textTertiary, fontVariantNumeric: "tabular-nums" },
  swatch: { width: 10, height: 10, borderRadius: 2, display: "inline-block" },
  gridLine: {
    position: "absolute",
    left: 28,
    right: 0,
    top: 0,
    borderTop: `1px dashed ${COLORS.divider}`,
  },
  axisLabel: { position: "absolute", left: -28, top: -7, width: 22, textAlign: "right", fontSize: 10, lineHeight: "14px", color: COLORS.textDim },
  bars: {
    position: "absolute",
    inset: "0 0 0 28px",
    display: "flex",
    alignItems: "flex-end",
    gap: 2,
    borderBottom: `1px solid ${COLORS.cardBorder}`,
  },
  barCol: { flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", cursor: "default", outline: "none", minWidth: 0 },
  barStack: { width: "70%", maxWidth: 28, display: "flex", flexDirection: "column" },
  xLabels: { display: "flex", gap: 2, marginTop: 4, paddingLeft: 28 },
  xLabel: { flex: 1, fontSize: 10, color: COLORS.textDim, textAlign: "center", whiteSpace: "nowrap", minWidth: 0, overflow: "visible" },
  details: { marginTop: 12 },
  summary: { fontSize: 12, color: COLORS.textTertiary, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 13 },
  th: { textAlign: "left", padding: "4px 6px", color: COLORS.textTertiary, fontWeight: 600, borderBottom: `1px solid ${COLORS.divider}` },
  thNum: { textAlign: "right", padding: "4px 6px", color: COLORS.textTertiary, fontWeight: 600, borderBottom: `1px solid ${COLORS.divider}` },
  td: { padding: "4px 6px", borderBottom: `1px solid ${COLORS.divider}` },
  tdNum: { padding: "4px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${COLORS.divider}` },
  countList: { display: "flex", flexDirection: "column", gap: 10 },
  countRow: { minWidth: 0 },
  countTop: { display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 },
  countName: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  countValue: { fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  countVisitors: { fontSize: 11, color: COLORS.textTertiary, minWidth: 64, textAlign: "right" },
  countTrack: { height: 4, marginTop: 4, background: "rgba(240,230,210,0.06)", borderRadius: 2 },
  countBar: { height: 4, background: RETURNING_COLOR, borderRadius: 2 },
  recentList: { display: "flex", flexDirection: "column" },
  recentRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 0",
    borderBottom: `1px solid ${COLORS.divider}`,
    fontSize: 13,
    flexWrap: "wrap",
  },
  recentTime: { color: COLORS.textDim, fontSize: 12, minWidth: 96, fontVariantNumeric: "tabular-nums" },
  visitorChip: {
    fontFamily: "ui-monospace, monospace",
    fontSize: 11,
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 3,
    padding: "1px 6px",
  },
  recentEvent: { flex: 1, minWidth: 0 },
  recentDetail: { color: COLORS.textTertiary },
  recentUser: { fontSize: 12, color: COLORS.gold },
};
