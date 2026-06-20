import { useEffect, useState, useRef } from "react";
import { fetchLpHistory } from "../../api";
import { toAbsoluteLp, TIER_COLORS, pickDefaultRange, filterByRange } from "../../utils/lp";
import { COLORS } from "../../utils/colors";
import type { LpSnapshot } from "../../types";

type Props = {
  puuid: string;
  onClick: () => void;
};

type DataPoint = {
  lp: number;
  tier: string;
  rank: string;
  rawLp: number;
  date: string;
  gained: boolean;
};

function formatTier(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function formatRank(tier: string, rank: string): string {
  const t = formatTier(tier);
  return APEX_TIERS.has(tier.toUpperCase()) ? t : `${t} ${rank}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export default function LpSparkline({ puuid, onClick }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLpHistory(puuid)
      .then((snapshots: LpSnapshot[]) => {
        if (cancelled) return;
        const all = Array.isArray(snapshots) ? snapshots : [];
        const range = pickDefaultRange(all);
        const arr = filterByRange(all, range);
        const points: DataPoint[] = arr.map((s, i) => {
          const lp = toAbsoluteLp(s.tier, s.rankDivision, s.leaguePoints);
          const prevLp = i > 0 ? toAbsoluteLp(arr[i - 1].tier, arr[i - 1].rankDivision, arr[i - 1].leaguePoints) : lp;
          return {
            lp,
            tier: s.tier,
            rank: s.rankDivision,
            rawLp: s.leaguePoints,
            date: formatDate(s.capturedAt),
            gained: lp >= prevLp,
          };
        });
        setData(points);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [puuid]);

  if (loading) return null;
  if (data.length < 2) {
    return (
      <div style={styles.card}>
        <div style={styles.titleRow}>
          <div style={styles.title}>LP History</div>
        </div>
        <div style={styles.empty}>No LP data</div>
      </div>
    );
  }

  const W = 256;
  const H = 100;
  const PAD_X = 8;
  const PAD_Y = 12;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  const lpValues = data.map((d) => d.lp);
  const minLp = Math.min(...lpValues);
  const maxLp = Math.max(...lpValues);
  const range = maxLp - minLp || 1;

  const points = data.map((d, i) => ({
    x: PAD_X + (i / (data.length - 1)) * chartW,
    y: PAD_Y + chartH - ((d.lp - minLp) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const latest = data[data.length - 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = W / rect.width;
    const scaledX = mouseX * scaleX;

    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - scaledX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    setHoveredIdx(closest);
  };

  const displayPoint = hoveredIdx !== null ? data[hoveredIdx] : latest;
  const tierColor = TIER_COLORS[displayPoint.tier.toUpperCase()] ?? "#D4A017";

  return (
    <div style={styles.card}>
      <div style={styles.titleRow}>
        <div style={styles.title}>LP History</div>
      </div>

      <div style={styles.infoRow}>
        <span style={{ ...styles.infoTier, color: tierColor }}>{formatRank(displayPoint.tier, displayPoint.rank)}</span>
        <span style={styles.infoLp}>{displayPoint.rawLp} LP</span>
        <span style={styles.infoDate}>{displayPoint.date}</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: 100, display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <path d={linePath} fill="none" stroke={COLORS.textTertiary} strokeWidth={1.5} />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 5 : 3.5}
            fill={TIER_COLORS[data[i].tier.toUpperCase()] ?? "#D4A017"}
            stroke={hoveredIdx === i ? COLORS.textPrimary : "none"}
            strokeWidth={hoveredIdx === i ? 1.5 : 0}
          />
        ))}

        {hoveredIdx !== null && (
          <line
            x1={points[hoveredIdx].x}
            y1={PAD_Y}
            x2={points[hoveredIdx].x}
            y2={H - PAD_Y}
            stroke="rgba(212,160,23,0.3)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}
      </svg>

      <button style={styles.viewFull} onClick={onClick}>
        View Full History &rarr;
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.textPrimary,
  },
  infoRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  infoTier: {
    fontSize: 13,
    fontWeight: 700,
    color: "#D4A017",
  },
  infoLp: {
    fontSize: 16,
    fontWeight: 800,
    color: COLORS.textPrimary,
  },
  infoDate: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  empty: {
    fontSize: 12,
    color: COLORS.textDim,
    padding: "8px 0",
  },
  viewFull: {
    background: "none",
    border: "none",
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    padding: "8px 0 0",
    display: "block",
    width: "100%",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
};
