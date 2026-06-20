/**
 * @file ChampionsTab.tsx
 * @description Render a grid of champion performance cards sorted by games played. Each card
 *   displays champion icon, name, games, win rate, KDA, average damage, and average CS.
 *   Data is fetched lazily from /api/trends/champions on tab activation.
 *   Supports game count and queue filters.
 * @module frontend.components.tabs
 */
import { useEffect, useState } from "react";
import { fetchChampionStats } from "../../api";
import { useDdragonVersion, ddragonBase, championIconUrl, hideOnError } from "../../utils/ddragon";
import { COLORS, winRateColor, kdaColor } from "../../utils/colors";
import type { ChampionStats } from "../../types";

type Props = { puuid: string };

const COUNT_OPTIONS = [
  { label: "20", value: 20 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "All", value: undefined },
] as const;

const QUEUE_OPTIONS = [
  { label: "All Queues", value: undefined },
  { label: "Ranked Solo", value: 420 },
  { label: "Ranked Flex", value: 440 },
] as const;

/**
 * Render the Champions tab content with a 2-column grid of champion stat cards.
 * Fetch data on mount and display loading/empty states as needed.
 *
 * @param props - The player's PUUID for fetching champion-specific stats.
 * @returns The champions tab grid element.
 */
export default function ChampionsTab({ puuid }: Props) {
  const [champions, setChampions] = useState<ChampionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [countFilter, setCountFilter] = useState<number | undefined>(undefined);
  const [queueFilter, setQueueFilter] = useState<number | undefined>(undefined);
  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChampionStats(puuid, countFilter, queueFilter)
      .then((data) => {
        if (cancelled) return;
        setChampions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setChampions([]);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [puuid, countFilter, queueFilter]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>Loading champion stats...</div>;

  return (
    <div>
      {/* Filter bar */}
      <div style={styles.filterBar}>
        <div style={styles.pillGroup}>
          {COUNT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setCountFilter(opt.value)}
              style={{
                ...styles.pill,
                background: countFilter === opt.value ? "#D4A017" : "transparent",
                color: countFilter === opt.value ? COLORS.pageBg : COLORS.textTertiary,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={styles.pillGroup}>
          {QUEUE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setQueueFilter(opt.value)}
              style={{
                ...styles.pill,
                background: queueFilter === opt.value ? "#D4A017" : "transparent",
                color: queueFilter === opt.value ? COLORS.pageBg : COLORS.textTertiary,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {champions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>No champion data available yet.</div>
      ) : (
        <div style={styles.grid}>
          {champions.map((c) => {
            const losses = c.games - c.wins;
            return (
              <div key={c.championName} style={styles.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <img
                    src={championIconUrl(c.championName, imgBase)}
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", flexShrink: 0 }}
                    onError={hideOnError}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>{c.championName}</div>
                    <div style={{ fontSize: 11, color: COLORS.textDim }}>{c.games} games</div>
                  </div>
                </div>
                <div style={styles.statsRow}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: winRateColor(c.winRate) }}>{c.winRate}%</div>
                    <div style={styles.statLabel}>Win Rate</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: kdaColor(c.avgKda) }}>{c.avgKda.toFixed(2)}</div>
                    <div style={styles.statLabel}>KDA</div>
                    <div style={{ fontSize: 10, color: COLORS.textDim }}>{c.avgKills}/{c.avgDeaths}/{c.avgAssists}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>{Math.round(c.avgDamage).toLocaleString()}</div>
                    <div style={styles.statLabel}>Avg Dmg</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>{c.avgCs}</div>
                    <div style={styles.statLabel}>Avg CS</div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <WinLossBar wins={c.wins} losses={losses} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return null;
  const winPct = (wins / total) * 100;

  return (
    <div style={{
      display: "flex",
      width: "100%",
      height: 16,
      borderRadius: 3,
      overflow: "hidden",
      fontSize: 10,
      fontWeight: 600,
      lineHeight: "16px",
    }}>
      <div style={{
        width: `${winPct}%`,
        minWidth: wins > 0 ? 20 : 0,
        background: "rgba(72,209,160,0.25)",
        color: "#48D1A0",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}>
        {wins}W
      </div>
      <div style={{
        width: `${100 - winPct}%`,
        minWidth: losses > 0 ? 20 : 0,
        background: "rgba(232,64,87,0.25)",
        color: "#E84057",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}>
        {losses}L
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  pillGroup: {
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: 16,
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-around",
  },
  statLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    color: COLORS.textDim,
    letterSpacing: 0.4,
    marginTop: 1,
  },
};
