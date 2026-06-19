import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fetchMatchTrends, fetchLpHistory } from "../api";
import { toAbsoluteLp, LP_TIME_RANGES, pickDefaultRange, filterByRange, countInRange } from "../utils/lp";
import type { LpTimeRange } from "../utils/lp";
import { movingAverage, rollingWinRate } from "../utils/trends";
import type { MatchTrendPoint, LpSnapshot } from "../types";

type ChartTab = "lp" | "winrate" | "kda" | "damage";

type Props = {
  puuid: string;
  onClose: () => void;
};

export default function PerformanceModal({ puuid, onClose }: Props) {
  const [activeChart, setActiveChart] = useState<ChartTab>("lp");
  const [trends, setTrends] = useState<MatchTrendPoint[]>([]);
  const [lpData, setLpData] = useState<LpSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lpRange, setLpRange] = useState<LpTimeRange>(30);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchMatchTrends(puuid).catch(() => []),
      fetchLpHistory(puuid).catch(() => []),
    ]).then(([t, lp]) => {
      if (cancelled) return;
      setTrends(Array.isArray(t) ? t : []);
      const lpArr = Array.isArray(lp) ? lp : [];
      setLpData(lpArr);
      setLpRange(pickDefaultRange(lpArr));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [puuid]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Chart data
  const kdaValues = trends.map((t) => {
    const kda = t.deaths === 0 ? t.kills + t.assists : (t.kills + t.assists) / t.deaths;
    return Math.round(kda * 100) / 100;
  });
  const kdaMA = movingAverage(kdaValues, 5);
  const kdaChartData = trends.map((t, i) => ({ idx: i + 1, kda: kdaValues[i], ma: kdaMA[i], win: t.win }));

  const wrValues = rollingWinRate(trends.map((t) => t.win), 10);
  const wrChartData = trends.map((_t, i) => ({ idx: i + 1, winRate: wrValues[i] }));

  const dmgMA = movingAverage(trends.map((t) => t.totalDamageDealtToChampions), 5);
  const dmgChartData = trends.map((t, i) => ({ idx: i + 1, damage: t.totalDamageDealtToChampions, ma: dmgMA[i], win: t.win }));

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

  const tabs: { id: ChartTab; label: string }[] = [
    { id: "lp", label: "LP" },
    { id: "winrate", label: "Win Rate" },
    { id: "kda", label: "KDA" },
    { id: "damage", label: "Damage" },
  ];

  const tooltipStyle = { background: "#111110", border: "1px solid #1e1c18", borderRadius: 6, fontSize: 12, color: "#EDE4D3" };

  const tierTicks = [0, 400, 800, 1200, 1600, 2000, 2400, 2800];
  const tierNames: Record<number, string> = {
    0: "Iron", 400: "Bronze", 800: "Silver", 1200: "Gold",
    1600: "Plat", 2000: "Emerald", 2400: "Diamond", 2800: "Master",
  };
  const tierDotColors: Record<string, string> = {
    IRON: "#78645A", BRONZE: "#8C6440", SILVER: "#A0AAB4",
    GOLD: "#C8AA3C", PLATINUM: "#50B4A0", EMERALD: "#28B464",
    DIAMOND: "#6490DC", MASTER: "#A064DC", GRANDMASTER: "#DC5050",
    CHALLENGER: "#F0C850",
  };

  const renderLpDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null) return null;
    const point = lpChartData[index];
    if (!point) return null;
    const color = tierDotColors[point.tier] ?? "#D4A017";
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#121210" strokeWidth={1} />;
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const renderLpTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload as (typeof lpChartData)[number];
    const color = tierDotColors[d.tier] ?? "#D4A017";
    return (
      <div style={{ ...tooltipStyle, padding: "8px 12px" }}>
        <div style={{ color, fontWeight: 700, marginBottom: 2 }}>{d.label}</div>
        <div style={{ color: "#7A7060" }}>{d.fullDate}</div>
      </div>
    );
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>Performance Trends</span>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={styles.pills}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveChart(t.id)}
              style={{
                ...styles.pill,
                background: activeChart === t.id ? "#D4A017" : "transparent",
                color: activeChart === t.id ? "#121210" : "#7A7060",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={styles.chartArea}>
          {loading && <div style={styles.placeholder}>Loading performance data...</div>}

          {!loading && trends.length === 0 && lpData.length === 0 && (
            <div style={styles.placeholder}>No trend data available yet. Play some games!</div>
          )}

          {!loading && activeChart === "lp" && (
            lpChartData.length > 1 ? (
              <>
              <div style={styles.rangePills}>
                {LP_TIME_RANGES.map((r) => {
                  const disabled = countInRange(lpData, r) < 2;
                  return (
                    <button
                      key={r}
                      disabled={disabled}
                      onClick={() => setLpRange(r)}
                      style={{
                        ...styles.rangePill,
                        background: lpRange === r ? "#D4A017" : "transparent",
                        color: lpRange === r ? "#121210" : disabled ? "#2a2820" : "#7A7060",
                        cursor: disabled ? "default" : "pointer",
                      }}
                    >
                      {r}D
                    </button>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111110" />
                  <XAxis dataKey="date" tick={{ fill: "#4A4540", fontSize: 10 }} />
                  <YAxis
                    ticks={tierTicks}
                    tickFormatter={(v: number) => tierNames[v] ?? ""}
                    tick={{ fill: "#4A4540", fontSize: 10 }}
                    domain={["dataMin - 100", "dataMax + 100"]}
                  />
                  <Tooltip content={renderLpTooltip} />
                  <Line type="monotone" dataKey="lp" stroke="#D4A017" strokeWidth={2} dot={renderLpDot} />
                </LineChart>
              </ResponsiveContainer>
              </>
            ) : <div style={styles.placeholder}>Not enough LP data for chart</div>
          )}

          {!loading && activeChart === "winrate" && (
            wrChartData.some((d) => d.winRate !== null) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={wrChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111110" />
                  <XAxis dataKey="idx" tick={{ fill: "#4A4540", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#4A4540", fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v != null ? `${v}%` : "\u2014", "Win Rate"]} />
                  <ReferenceLine y={50} stroke="#1e1c18" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="winRate" stroke="#D4A017" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={styles.placeholder}>Not enough data for win rate chart</div>
          )}

          {!loading && activeChart === "kda" && (
            kdaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={kdaChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111110" />
                  <XAxis dataKey="idx" tick={{ fill: "#4A4540", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#4A4540", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [Number(v ?? 0).toFixed(2), name === "ma" ? "5-game avg" : "KDA"]}
                  />
                  <Line type="monotone" dataKey="kda" stroke="#D4A017" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="ma" stroke="#E8C84A" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={styles.placeholder}>Not enough data for KDA chart</div>
          )}

          {!loading && activeChart === "damage" && (
            dmgChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dmgChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111110" />
                  <XAxis dataKey="idx" tick={{ fill: "#4A4540", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#4A4540", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [Number(v ?? 0).toLocaleString(), name === "ma" ? "5-game avg" : "Damage"]}
                  />
                  <Line type="monotone" dataKey="damage" stroke="#C44040" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="ma" stroke="#E8C84A" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={styles.placeholder}>Not enough data for damage chart</div>
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
    background: "#121210",
    border: "1px solid #1e1c18",
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
    color: "#EDE4D3",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#7A7060",
    fontSize: 24,
    cursor: "pointer",
    lineHeight: 1,
  },
  pills: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
  },
  pill: {
    border: "1px solid #1e1c18",
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
    marginBottom: 10,
    justifyContent: "flex-end",
  },
  rangePill: {
    border: "1px solid #1e1c18",
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
    color: "#7A7060",
  },
};
