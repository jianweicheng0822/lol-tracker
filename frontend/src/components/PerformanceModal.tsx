import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchLpHistory } from "../api";
import { toAbsoluteLp, TIER_COLORS, LP_TIME_RANGES, pickDefaultRange, filterByRange, countInRange, hasDataBeyond } from "../utils/lp";
import type { LpTimeRange } from "../utils/lp";
import { COLORS } from "../utils/colors";
import type { LpSnapshot } from "../types";

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
  const lpChartData = filteredLpData.map((s) => {
    const d = new Date(s.capturedAt);
    return {
      date: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`,
      fullDate: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`,
      lp: toAbsoluteLp(s.tier, s.rankDivision, s.leaguePoints),
      tier: s.tier.toUpperCase(),
      label: `${s.tier.charAt(0)}${s.tier.slice(1).toLowerCase()} ${s.rankDivision} ${s.leaguePoints}LP`,
    };
  });

  const tooltipStyle = { background: COLORS.pageBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 6, fontSize: 12, color: COLORS.textPrimary };

  const tierTicks = [0, 400, 800, 1200, 1600, 2000, 2400, 2800];
  const tierNames: Record<number, string> = {
    0: "Iron", 400: "Bronze", 800: "Silver", 1200: "Gold",
    1600: "Plat", 2000: "Emerald", 2400: "Diamond", 2800: "Master",
  };
  const renderLpDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null) return null;
    const point = lpChartData[index];
    if (!point) return null;
    const color = TIER_COLORS[point.tier] ?? "#D4A017";
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke={COLORS.pageBg} strokeWidth={1} />;
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const renderLpTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload as (typeof lpChartData)[number];
    const color = TIER_COLORS[d.tier] ?? "#D4A017";
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
                  background: queue === q.id ? "#D4A017" : "transparent",
                  color: queue === q.id ? COLORS.pageBg : COLORS.textTertiary,
                }}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Time range pills */}
          {!loading && lpChartData.length > 1 && (
            <div style={styles.rangePills}>
              {LP_TIME_RANGES.map((r, idx) => {
                const tooFew = countInRange(lpData, r) < 2;
                const prevRange = idx > 0 ? LP_TIME_RANGES[idx - 1] : 0;
                const noExtra = idx > 0 && !tooFew && !hasDataBeyond(lpData, prevRange, r);
                const disabled = tooFew || noExtra;
                const tooltip = tooFew
                  ? "Not enough data"
                  : noExtra
                    ? `No additional data beyond ${prevRange}D`
                    : undefined;
                return (
                  <button
                    key={r}
                    disabled={disabled}
                    onClick={() => setLpRange(r)}
                    title={tooltip}
                    style={{
                      ...styles.rangePill,
                      background: lpRange === r ? "#D4A017" : "transparent",
                      color: lpRange === r ? COLORS.pageBg : disabled ? "#2a2a30" : COLORS.textTertiary,
                      cursor: disabled ? "default" : "pointer",
                    }}
                  >
                    {r}D
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.chartArea}>
          {loading && <div style={styles.placeholder}>Loading LP data...</div>}

          {!loading && lpData.length === 0 && (
            <div style={styles.placeholder}>No LP data for {QUEUE_OPTIONS.find((q) => q.id === queue)?.label}.</div>
          )}

          {!loading && lpData.length > 0 && lpChartData.length <= 1 && (
            <div style={styles.placeholder}>Not enough LP data for chart</div>
          )}

          {!loading && lpChartData.length > 1 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lpChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.divider} />
                <XAxis dataKey="date" tick={{ fill: COLORS.textDim, fontSize: 10 }} />
                <YAxis
                  ticks={tierTicks}
                  tickFormatter={(v: number) => tierNames[v] ?? ""}
                  tick={{ fill: COLORS.textDim, fontSize: 10 }}
                  domain={["dataMin - 100", "dataMax + 100"]}
                />
                <Tooltip content={renderLpTooltip} />
                <Line type="monotone" dataKey="lp" stroke="#D4A017" strokeWidth={2} dot={renderLpDot} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
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
    borderRadius: 10,
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
    borderRadius: 12,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 600,
    transition: "background 0.15s, color 0.15s",
  },
  placeholder: {
    textAlign: "center",
    padding: 40,
    opacity: 0.5,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
};
