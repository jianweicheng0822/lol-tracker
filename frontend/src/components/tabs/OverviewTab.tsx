import { useState } from "react";
import type { PlayerStats, MatchSummary, RankedEntry, TabId } from "../../types";
import { useIsMobile } from "../../hooks/useIsMobile";
import OverviewSidebar from "../sidebar/OverviewSidebar";
import MatchList from "../MatchList";
import LpSparkline from "../sidebar/LpSparkline";
import PerformanceModal from "../PerformanceModal";
import UpgradeModal from "../UpgradeModal";
import { COLORS } from "../../utils/colors";

type Props = {
  stats: PlayerStats | null;
  matches: MatchSummary[];
  ranked: RankedEntry[];
  region: string;
  puuid: string;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  tier: number;
  onTabChange: (tab: TabId) => void;
  onShowAuth: () => void;
  onTierChange: (tier: number) => void;
};

export default function OverviewTab({
  stats, matches, ranked, region, puuid,
  onLoadMore, isLoadingMore, hasMore, tier,
  onTabChange, onShowAuth,
}: Props) {
  const isMobile = useIsMobile();
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem("upgrade_banner_dismissed") === "1"
  );

  function dismissBanner() {
    setBannerDismissed(true);
    sessionStorage.setItem("upgrade_banner_dismissed", "1");
  }

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
          {tier === 0 && !bannerDismissed && (
            <div style={styles.upgradeBanner}>
              <div style={styles.bannerLeft}>
                <span style={styles.proBadge}>PRO</span>
                <div>
                  <span style={styles.bannerTitle}>
                    Unlock AI match coaching
                  </span>
                  <span style={styles.bannerSub}>
                    $4.99/mo &middot; cancel anytime
                  </span>
                </div>
              </div>
              <div style={styles.bannerRight}>
                <button
                  style={styles.upgradeBtn}
                  onClick={() => setShowUpgradeModal(true)}
                >
                  See Plans
                </button>
                <button style={styles.dismissBtn} onClick={dismissBanner}>
                  {"\u00d7"}
                </button>
              </div>
            </div>
          )}
          {isMobile && (
            <LpSparkline puuid={puuid} onClick={() => setShowPerformanceModal(true)} />
          )}
          <MatchList
            matches={matches}
            region={region}
            puuid={puuid}
            onLoadMore={onLoadMore}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            tier={tier}
            onShowUpgrade={() => setShowUpgradeModal(true)}
          />
        </div>
      </div>

      {showPerformanceModal && (
        <PerformanceModal puuid={puuid} onClose={() => setShowPerformanceModal(false)} />
      )}

      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          onShowAuth={() => { setShowUpgradeModal(false); onShowAuth(); }}
        />
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
    background: "linear-gradient(135deg, rgba(212,160,23,0.12) 0%, rgba(212,160,23,0.04) 100%)",
    border: "1px solid rgba(212,160,23,0.25)",
    padding: "12px 16px",
    borderRadius: 10,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  proBadge: {
    background: "linear-gradient(135deg, #D4A017, #F5D060)",
    color: "#1a1a1a",
    fontWeight: 800,
    fontSize: 11,
    padding: "3px 10px",
    borderRadius: 14,
    letterSpacing: 1,
    flexShrink: 0,
  },
  bannerTitle: {
    display: "block",
    color: "#F5D060",
    fontSize: 14,
    fontWeight: 600,
  },
  bannerSub: {
    display: "block",
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  bannerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  upgradeBtn: {
    background: "linear-gradient(135deg, #D4A017, #E8C84A)",
    color: "#1a1a1a",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  dismissBtn: {
    background: "none",
    border: "none",
    color: COLORS.textDim,
    fontSize: 18,
    cursor: "pointer",
    padding: "0 4px",
  },
};
