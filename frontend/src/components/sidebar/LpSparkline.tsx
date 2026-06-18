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
          <Line type="monotone" dataKey="lp" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#7e8fa6",
    fontWeight: 500,
    marginBottom: 8,
  },
  empty: {
    fontSize: 12,
    color: "#546378",
    padding: "8px 0",
  },
};
