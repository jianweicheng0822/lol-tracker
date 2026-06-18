import { useState } from "react";
import type { PlayerStats, MatchSummary, RankedEntry } from "../../types";
import { useIsMobile } from "../../hooks/useIsMobile";
import RankSummary from "./RankSummary";
import LpSparkline from "./LpSparkline";
import RecentStatsPreview from "./RecentStatsPreview";
import TopChampionsPreview from "./TopChampionsPreview";

type Props = {
  stats: PlayerStats | null;
  matches: MatchSummary[];
  ranked: RankedEntry[];
  puuid: string;
  onOpenPerformance: () => void;
  onViewChampions: () => void;
};

export default function OverviewSidebar({ stats, matches, ranked, puuid, onOpenPerformance, onViewChampions }: Props) {
  const isMobile = useIsMobile();
  const [statsOpen, setStatsOpen] = useState(false);
  const [champsOpen, setChampsOpen] = useState(false);

  return (
    <div style={isMobile ? undefined : { position: "sticky", top: 20 }}>
      <RankSummary entries={ranked} />

      {!isMobile && <LpSparkline puuid={puuid} onClick={onOpenPerformance} />}

      {isMobile ? (
        <>
          <Accordion label="Recent Stats" open={statsOpen} onToggle={() => setStatsOpen(!statsOpen)}>
            {stats && <RecentStatsPreview stats={stats} onClick={onOpenPerformance} />}
          </Accordion>
          <Accordion label="Top Champions" open={champsOpen} onToggle={() => setChampsOpen(!champsOpen)}>
            <TopChampionsPreview matches={matches} onViewAll={onViewChampions} />
          </Accordion>
        </>
      ) : (
        <>
          {stats && <RecentStatsPreview stats={stats} onClick={onOpenPerformance} />}
          <TopChampionsPreview matches={matches} onViewAll={onViewChampions} />
        </>
      )}
    </div>
  );
}

function Accordion({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={onToggle} style={accStyles.header}>
        {label}
        <span style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 0.15s", display: "inline-block" }}>&#9656;</span>
      </button>
      <div style={{ maxHeight: open ? 500 : 0, overflow: "hidden", transition: "max-height 0.2s ease" }}>
        {children}
      </div>
    </div>
  );
}

const accStyles: Record<string, React.CSSProperties> = {
  header: {
    background: "rgba(30,41,59,0.45)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
};
