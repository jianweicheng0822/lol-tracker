import { useState } from "react";
import type { PlayerStats, MatchSummary, RankedEntry } from "../../types";
import { useIsMobile } from "../../hooks/useIsMobile";
import RankSummary from "./RankSummary";
import LpSparkline from "./LpSparkline";
import RecentStatsPreview from "./RecentStatsPreview";
import TopChampionsPreview from "./TopChampionsPreview";
import { isRankedQueue } from "../../utils/ddragon";
import { rankedScopeLabel } from "../../utils/playerInsights";

/** Matches the count PlayerPage passes to /api/stats. */
const RECENT_MATCH_COUNT = 20;

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
  // Same games as the backend stats (ranked games among the 20 most recent), so every sidebar
  // number describes one sample and doesn't shift when more matches are loaded
  const recentRanked = matches.slice(0, RECENT_MATCH_COUNT).filter((m) => isRankedQueue(m.queueId));
  const scopeLabel = rankedScopeLabel(recentRanked.length, Math.min(matches.length, RECENT_MATCH_COUNT));

  return (
    <div style={isMobile ? undefined : { position: "sticky", top: 20 }}>
      <RankSummary entries={ranked} />
      {!isMobile && <LpSparkline puuid={puuid} onClick={onOpenPerformance} />}

      {isMobile ? (
        <>
          <Accordion label="Recent Ranked Games" open={statsOpen} onToggle={() => setStatsOpen(!statsOpen)}>
            {stats && <RecentStatsPreview stats={stats} matches={recentRanked} scopeLabel={scopeLabel} />}
          </Accordion>
          <Accordion label="Top Champions" open={champsOpen} onToggle={() => setChampsOpen(!champsOpen)}>
            <TopChampionsPreview matches={recentRanked} onViewAll={onViewChampions} scopeLabel={scopeLabel} />
          </Accordion>
        </>
      ) : (
        <>
          {stats && <RecentStatsPreview stats={stats} matches={recentRanked} scopeLabel={scopeLabel} />}
          <TopChampionsPreview matches={recentRanked} onViewAll={onViewChampions} scopeLabel={scopeLabel} />
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
    background: "rgba(35,35,40,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#7B7A8E",
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
