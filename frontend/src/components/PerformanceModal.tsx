import { useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchLpHistory } from "../api";
import { toAbsoluteLp, TIER_COLORS, LP_TIME_RANGES, pickDefaultRange, filterByRange, countInRange, hasDataBeyond, lpAxis, formatRank, formatShortDate, timeTicks, startedDay } from "../utils/lp";
import type { LpTimeRange } from "../utils/lp";
import { COLORS } from "../utils/colors";
import type { LpSnapshot } from "../types";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

type QueueFilter = "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";

const QUEUE_OPTIONS: { id: QueueFilter; label: string }[] = [
  { id: "RANKED_SOLO_5x5", label: "Solo/Duo" },
  { id: "RANKED_FLEX_SR", label: "Flex" },
];

type Props = {
  puuid: string;
  onClose: () => void;
};

export default function PerformanceModal({ puuid, onClose }: Props) {
  useBodyScrollLock();
  const [queue, setQueue] = useState<QueueFilter>("RANKED_SOLO_5x5");
  const [lpData, setLpData] = useState<LpSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lpRange, setLpRange] = useState<LpTimeRange>(30);

  const fetchIdRef = useRef(0);

  useEffect(() => {
    const id = ++fetchIdRef.current;
    fetchLpHistory(puuid, queue)
      .catch(() => [])
      .then((lp) => {
        if (fetchIdRef.current !== id) return;
        const lpArr = Array.isArray(lp) ? lp : [];
        setLpData(lpArr);
        setLpRange(pickDefaultRange(lpArr));
        setLoading(false);
      });
  }, [puuid, queue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filteredLpData = filterByRange(lpData, lpRange);
  const lpChartData = filteredLpData.map((s) => ({
    // Plotted on a time scale, so several snapshots in a day don't repeat the date and gaps show
    t: s.capturedAt,
    fullDate: new Date(s.capturedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
    lp: toAbsoluteLp(s.tier, s.rankDivision, s.leaguePoints),
    tier: s.tier.toUpperCase(),
    label: `${formatRank(s.tier, s.rankDivision)} ${s.leaguePoints.toLocaleString()} LP`,
  }));
  const yAxis = lpChartData.length > 0 ? lpAxis(lpChartData.map((d) => d.lp)) : null;

  // Summary over the selected range
  const latest = lpData[lpData.length - 1];
  const first = lpChartData[0];
  const last = lpChartData[lpChartData.length - 1];
  const change = first && last ? last.lp - first.lp : 0;
  const peak = lpChartData.reduce<(typeof lpChartData)[number] | null>((best, d) => (!best || d.lp > best.lp ? d : best), null);

  // Only offer ranges that show something the shorter one doesn't
  const ranges = LP_TIME_RANGES.filter((r, idx) =>
    countInRange(lpData, r) >= 2 && (idx === 0 || hasDataBeyond(lpData, LP_TIME_RANGES[idx - 1], r)));
  const trackingSince = lpData.length > 0 ? lpData[0].capturedAt : null;
  // When the range reaches back to the first snapshot, "Last 30 days" would overstate it
  const changeLabel = trackingSince && first?.t === trackingSince
    ? `Since ${formatShortDate(trackingSince)}`
    : `Last ${lpRange} days`;

  const tooltipStyle = { background: COLORS.pageBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 3, fontSize: 12, color: COLORS.textPrimary };

  // Only the latest point gets a dot; the rest show on hover, so dense history stays readable
  const renderLpDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index !== lpChartData.length - 1) return <g key={index} />;
    const color = TIER_COLORS[lpChartData[index].tier] ?? COLORS.gold;
    return <circle key={index} cx={cx} cy={cy} r={4} fill={color} stroke={COLORS.pageBg} strokeWidth={1.5} />;
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const renderLpTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload as (typeof lpChartData)[number];
    const color = TIER_COLORS[d.tier] ?? "#C89B3C";
    return (
      <div style={{ ...tooltipStyle, padding: "8px 12px" }}>
        <div style={{ color, fontWeight: 700, marginBottom: 2 }}>{d.label}</div>
        <div style={{ color: COLORS.textTertiary }}>{d.fullDate}</div>
      </div>
    );
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>Ranked Progression</span>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {/* Queue filter */}
        <div style={styles.controlsRow}>
          <div style={styles.queuePills}>
            {QUEUE_OPTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => { setQueue(q.id); setLoading(true); }}
                style={{
                  ...styles.pill,
                  background: queue === q.id ? "#C89B3C" : "transparent",
                  color: queue === q.id ? COLORS.pageBg : COLORS.textTertiary,
                }}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Time range pills: hidden when only one range has data */}
          {!loading && ranges.length > 1 && (
            <div style={styles.rangePills}>
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setLpRange(r)}
                  style={{
                    ...styles.rangePill,
                    background: lpRange === r ? COLORS.gold : "transparent",
                    color: lpRange === r ? COLORS.pageBg : COLORS.textTertiary,
                  }}
                >
                  {r}D
                </button>
              ))}
            </div>
          )}
        </div>

        {!loading && latest && (
          <div style={styles.summary}>
            <div>
              <div style={styles.summaryLabel}>Current</div>
              <div style={{ ...styles.summaryValue, color: TIER_COLORS[latest.tier.toUpperCase()] ?? COLORS.gold }}>
                {formatRank(latest.tier, latest.rankDivision)} <span style={styles.summaryLp}>{latest.leaguePoints.toLocaleString()} LP</span>
              </div>
            </div>
            {lpChartData.length > 1 && (
              <>
                <div>
                  <div style={styles.summaryLabel}>{changeLabel}</div>
                  <div style={{ ...styles.summaryValue, color: change > 0 ? COLORS.teal : change < 0 ? COLORS.loss : COLORS.textSecondary }}>
                    {change > 0 ? "+" : ""}{change.toLocaleString()} LP
                  </div>
                </div>
                {peak && (
                  <div>
                    <div style={styles.summaryLabel}>Peak</div>
                    <div style={styles.summaryValue}>{peak.label}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={styles.chartArea}>
          {loading && <div style={styles.placeholder}>Loading LP data...</div>}

          {!loading && lpData.length === 0 && (
            <div style={styles.placeholder}>No {QUEUE_OPTIONS.find((q) => q.id === queue)?.label} LP recorded yet.</div>
          )}

          {!loading && lpData.length > 0 && lpChartData.length <= 1 && (
            <div style={styles.placeholder}>
              Tracking started {trackingSince ? startedDay(trackingSince) : "recently"}. A line appears once their LP changes.
            </div>
          )}

          {!loading && lpChartData.length > 1 && (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={lpChartData}>
                <defs>
                  <linearGradient id="lpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={COLORS.divider} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  ticks={lpChartData.length > 1 ? timeTicks(lpChartData[0].t, lpChartData[lpChartData.length - 1].t) : undefined}
                  tickFormatter={formatShortDate}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.textDim, fontSize: 10 }}
                />
                <YAxis
                  ticks={yAxis?.ticks}
                  tickFormatter={yAxis?.format}
                  domain={yAxis?.domain}
                  width={72}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.textDim, fontSize: 10 }}
                />
                <Tooltip content={renderLpTooltip} />
                <Area
                  type="linear"
                  dataKey="lp"
                  stroke={COLORS.gold}
                  strokeWidth={2}
                  fill="url(#lpFill)"
                  dot={renderLpDot}
                  activeDot={{ r: 5, fill: COLORS.gold, stroke: COLORS.pageBg, strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && trackingSince && (
          <div
            style={styles.caption}
            title="LP is recorded whenever it changes, starting from the first time a player is looked up on LoL Tracker."
          >
            Tracking since {new Date(trackingSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} &#9432;
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: COLORS.pageBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 4,
    maxWidth: 900,
    width: "90vw",
    maxHeight: "80vh",
    overflow: "auto",
    padding: 24,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: COLORS.textTertiary,
    fontSize: 24,
    cursor: "pointer",
    lineHeight: 1,
  },
  controlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  queuePills: {
    display: "flex",
    gap: 4,
  },
  pill: {
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  chartArea: {
    minHeight: 280,
  },
  rangePills: {
    display: "flex",
    gap: 4,
  },
  rangePill: {
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 4,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 600,
    transition: "background 0.15s, color 0.15s",
  },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px 40px",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.textDim,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.textPrimary,
  },
  summaryLp: {
    color: COLORS.textPrimary,
  },
  caption: {
    marginTop: 8,
    cursor: "help",
    width: "fit-content",
    fontSize: 12,
    color: COLORS.textDim,
    lineHeight: 1.5,
  },
  placeholder: {
    textAlign: "center",
    padding: 40,
    opacity: 0.5,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
};
