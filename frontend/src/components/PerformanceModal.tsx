import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import { fetchMatchTrends, fetchLpHistory } from "../api";
import { toAbsoluteLp } from "../utils/lp";
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchMatchTrends(puuid).catch(() => []),
      fetchLpHistory(puuid).catch(() => []),
    ]).then(([t, lp]) => {
      if (cancelled) return;
      setTrends(Array.isArray(t) ? t : []);
      setLpData(Array.isArray(lp) ? lp : []);
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

  const lpChartData = lpData.map((s, i) => ({
    idx: i + 1,
    lp: toAbsoluteLp(s.tier, s.rankDivision, s.leaguePoints),
    label: `${s.tier.charAt(0)}${s.tier.slice(1).toLowerCase()} ${s.rankDivision} ${s.leaguePoints}LP`,
  }));

  const tabs: { id: ChartTab; label: string }[] = [
    { id: "lp", label: "LP" },
    { id: "winrate", label: "Win Rate" },
    { id: "kda", label: "KDA" },
    { id: "damage", label: "Damage" },
  ];

  const tooltipStyle = { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 12, color: "#e2e8f0" };

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
                background: activeChart === t.id ? "#6366f1" : "transparent",
                color: activeChart === t.id ? "#fff" : "#94a3b8",
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
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(_v, _name, props: Payload<number, string>) => [(props.payload as Record<string, string>).label, "LP"]}
                  />
                  <Line type="monotone" dataKey="lp" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={styles.placeholder}>Not enough LP data for chart</div>
          )}

          {!loading && activeChart === "winrate" && (
            wrChartData.some((d) => d.winRate !== null) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={wrChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v != null ? `${v}%` : "\u2014", "Win Rate"]} />
                  <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="winRate" stroke="#4ade80" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={styles.placeholder}>Not enough data for win rate chart</div>
          )}

          {!loading && activeChart === "kda" && (
            kdaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={kdaChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [Number(v ?? 0).toFixed(2), name === "ma" ? "5-game avg" : "KDA"]}
                  />
                  <Line type="monotone" dataKey="kda" stroke="#6366f1" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="ma" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={styles.placeholder}>Not enough data for KDA chart</div>
          )}

          {!loading && activeChart === "damage" && (
            dmgChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dmgChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [Number(v ?? 0).toLocaleString(), name === "ma" ? "5-game avg" : "Damage"]}
                  />
                  <Line type="monotone" dataKey="damage" stroke="#ef4444" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="ma" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
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
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 12,
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
    color: "#e2e8f0",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
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
    border: "1px solid #334155",
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
  placeholder: {
    textAlign: "center",
    padding: 40,
    opacity: 0.5,
    fontSize: 14,
    color: "#94a3b8",
  },
};
