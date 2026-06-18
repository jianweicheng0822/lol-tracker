import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { fetchLpHistory } from "../../api";
import { toAbsoluteLp } from "../../utils/lp";
import type { LpSnapshot } from "../../types";

type Props = {
  puuid: string;
  onClick: () => void;
};

export default function LpSparkline({ puuid, onClick }: Props) {
  const [data, setData] = useState<{ lp: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLpHistory(puuid)
      .then((snapshots: LpSnapshot[]) => {
        if (cancelled) return;
        setData(
          (Array.isArray(snapshots) ? snapshots : []).map((s) => ({
            lp: toAbsoluteLp(s.tier, s.rankDivision, s.leaguePoints),
          }))
        );
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [puuid]);

  if (loading) return null;
  if (data.length < 2) {
    return (
      <div style={styles.card}>
        <div style={styles.title}>LP Trend</div>
        <div style={styles.empty}>No LP data</div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.card, cursor: "pointer" }} onClick={onClick}>
      <div style={styles.title}>LP Trend</div>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="lp" stroke="#34d399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(22,27,34,0.65)",
    border: "1px solid rgba(52,211,153,0.08)",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#484f58",
    fontWeight: 500,
    marginBottom: 8,
  },
  empty: {
    fontSize: 12,
    color: "#484f58",
    padding: "8px 0",
  },
};
