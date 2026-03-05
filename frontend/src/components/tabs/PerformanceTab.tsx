/**
 * Performance tab — 4 Recharts line charts showing historical trends:
 *   1. LP Progression    — absolute LP over time (from LP snapshots)
 *   2. Win Rate Trend    — rolling 10-game win rate percentage
 *   3. KDA Trend         — per-game KDA with 5-game moving average
 *   4. Damage / Game     — per-game damage with 5-game moving average
 *
 * Data is fetched lazily on tab activation from /api/trends/matches and /api/trends/lp.
 * Charts use a 2-column grid layout to fit the wider dashboard (1060px).
 */
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fetchMatchTrends, fetchLpHistory } from "../../api";
import { toAbsoluteLp } from "../../utils/lp";
import { movingAverage, rollingWinRate } from "../../utils/trends";
import type { MatchTrendPoint, LpSnapshot } from "../../types";

type Props = { puuid: string };

export default function PerformanceTab({ puuid }: Props) {
  const [trends, setTrends] = useState<MatchTrendPoint[]>([]);
  const [lpData, setLpData] = useState<LpSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Lazy fetch — only loads when the Performance tab is first activated
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Fetch match trends and LP history in parallel
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

  if (loading) return <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>Loading performance data...</div>;
  if (trends.length === 0 && lpData.length === 0) return <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>No trend data available yet. Play some games!</div>;

  // --- Compute chart datasets from raw trend points ---

  // KDA per game with 5-game moving average overlay (yellow line)
  const kdaValues = trends.map((t) => {
    const kda = t.deaths === 0 ? t.kills + t.assists : (t.kills + t.assists) / t.deaths;
    return Math.round(kda * 100) / 100;
  });
  const kdaMA = movingAverage(kdaValues, 5);
  const kdaChartData = trends.map((t, i) => ({
    idx: i + 1,       // Game number (X-axis)
    kda: kdaValues[i], // Raw KDA for this game
    ma: kdaMA[i],      // 5-game moving average (null for first 4 games)
    win: t.win,
  }));

  // Rolling 10-game win rate — null until 10 games are accumulated
  const wrValues = rollingWinRate(trends.map((t) => t.win), 10);
  const wrChartData = trends.map((_t, i) => ({
    idx: i + 1,
    winRate: wrValues[i],
  }));

  // Damage per game with 5-game moving average
  const dmgMA = movingAverage(trends.map((t) => t.totalDamageDealtToChampions), 5);
  const dmgChartData = trends.map((t, i) => ({
    idx: i + 1,
    damage: t.totalDamageDealtToChampions,
    ma: dmgMA[i],
    win: t.win,
  }));

  // LP progression — converts tier+rank+LP to a single number for the Y-axis
  const lpChartData = lpData.map((s, i) => ({
    idx: i + 1,
    lp: toAbsoluteLp(s.tier, s.rankDivision, s.leaguePoints),
    label: `${s.tier.charAt(0)}${s.tier.slice(1).toLowerCase()} ${s.rankDivision} ${s.leaguePoints}LP`,
  }));

  // --- Render chart cards — each only shows if there's sufficient data ---
  return (
    <div style={styles.grid}>
      {/* LP chart — needs at least 2 snapshots to show a meaningful line */}
      {lpChartData.length > 1 && (
        <ChartCard title="LP Progression">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lpChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 12, color: "#e2e8f0" }}
                formatter={(_: any, __: any, props: any) => [props.payload.label, "LP"]}
              />
              <Line type="monotone" dataKey="lp" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Win rate — 50% reference line helps contextualize the trend */}
      {wrChartData.some((d) => d.winRate !== null) && (
        <ChartCard title="Win Rate Trend (Rolling 10)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={wrChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 12, color: "#e2e8f0" }}
                formatter={(v: any) => [v !== null ? `${v}%` : "—", "Win Rate"]}
              />
              <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="winRate" stroke="#4ade80" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* KDA — indigo raw line + yellow moving average for smoothed trend */}
      {kdaChartData.length > 0 && (
        <ChartCard title="KDA Trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={kdaChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 12, color: "#e2e8f0" }}
                formatter={(v: any, name?: string) => [Number(v).toFixed(2), name === "ma" ? "5-game avg" : "KDA"]}
              />
              <Line type="monotone" dataKey="kda" stroke="#6366f1" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="ma" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Damage — red raw line + yellow moving average */}
      {dmgChartData.length > 0 && (
        <ChartCard title="Damage / Game">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dmgChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="idx" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 12, color: "#e2e8f0" }}
                formatter={(v: any, name?: string) => [Number(v).toLocaleString(), name === "ma" ? "5-game avg" : "Damage"]}
              />
              <Line type="monotone" dataKey="damage" stroke="#ef4444" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="ma" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

/** Reusable card wrapper with uppercase section title and dark semi-transparent background. */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  card: {
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 10,
    padding: 16,
  },
  cardTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#7e8fa6",
    fontWeight: 500,
    marginBottom: 12,
  },
};
