import { useState } from "react";
import type { PlayerStats, MatchSummary, RankedEntry, TabId } from "../../types";
import { useIsMobile } from "../../hooks/useIsMobile";
import OverviewSidebar from "../sidebar/OverviewSidebar";
import StatsBar from "../StatsBar";
import MatchList from "../MatchList";
import LpSparkline from "../sidebar/LpSparkline";
import PerformanceModal from "../PerformanceModal";
import { getAuthToken, upgradeTier } from "../../api";

type Props = {
  stats: PlayerStats | null;
  matches: MatchSummary[];
  ranked: RankedEntry[];
  region: string;
  puuid: string;
  gameName: string;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  tier: number;
  onTabChange: (tab: TabId) => void;
  onShowAuth: () => void;
  onTierChange: (tier: number) => void;
};

export default function OverviewTab({
  stats, matches, ranked, region, puuid, gameName,
  onLoadMore, isLoadingMore, hasMore, tier,
  onTabChange, onShowAuth, onTierChange,
}: Props) {
  const isMobile = useIsMobile();
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  return (
    <>
      <div style={isMobile ? styles.stackLayout : styles.gridLayout}>
        <OverviewSidebar
          stats={stats}
          matches={matches}
          ranked={ranked}
          puuid={puuid}
          onOpenPerformance={() => setShowPerformanceModal(true)}
          onViewChampions={() => onTabChange("champions")}
        />
        <div>
          {tier === 0 && (
            <div style={styles.upgradeBanner}>
              FREE tier: 20 matches max, no AI analysis.{" "}
              {getAuthToken() ? (
                <button
                  style={styles.upgradeBtn}
                  onClick={async () => { const d = await upgradeTier(); onTierChange(d.tier); }}
                >
                  Upgrade to PRO
                </button>
              ) : (
                <button
                  style={{ ...styles.upgradeBtn, background: "#4f46e5" }}
                  onClick={onShowAuth}
                >
                  Log in to upgrade
                </button>
              )}
            </div>
          )}
          {stats && <StatsBar stats={stats} matches={matches} />}
          {isMobile && (
            <LpSparkline puuid={puuid} onClick={() => setShowPerformanceModal(true)} />
          )}
          <MatchList
            matches={matches}
            region={region}
            puuid={puuid}
            gameName={gameName}
            onLoadMore={onLoadMore}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            tier={tier}
          />
        </div>
      </div>

      {showPerformanceModal && (
        <PerformanceModal puuid={puuid} onClose={() => setShowPerformanceModal(false)} />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  gridLayout: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: 20,
  },
  stackLayout: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  upgradeBanner: {
    background: "#1e3a5f",
    color: "#93c5fd",
    padding: "10px 16px",
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  upgradeBtn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
};
