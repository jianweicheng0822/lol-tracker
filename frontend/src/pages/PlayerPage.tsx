/**
 * @file PlayerPage.tsx
 * @description Tabbed player dashboard with ranked info, stats, match history, and trends.
 * @module frontend.pages
 *
 * Fetch account, matches, stats, ranked, and favorite status in parallel on mount.
 * Support tabbed navigation via URL search params (?tab=overview).
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import AuthModal from "../components/AuthModal";
import ProfileHeader from "../components/ProfileHeader";
import TabBar from "../components/TabBar";
import OverviewTab from "../components/tabs/OverviewTab";
import PerformanceTab from "../components/tabs/PerformanceTab";
import ChampionsTab from "../components/tabs/ChampionsTab";
import MatchHistoryTab from "../components/tabs/MatchHistoryTab";
import { useTabNavigation } from "../hooks/useTabNavigation";
import { fetchAccount, fetchAccountByPuuid, fetchMatchSummaries, fetchStats, fetchRanked, checkIsFavorite, addFavorite, removeFavorite, fetchTier, upgradeTier, getAuthToken, setAuthToken } from "../api";
import type { Region, Account, MatchSummary, PlayerStats, RankedEntry } from "../types";

export default function PlayerPage() {
  // Extract player identifiers from the URL route params
  // Supports both /player/:region/:gameName/:tag and /player/puuid/:region/:puuid
  const { region, gameName, tag, puuid: puuidParam } = useParams<{ region: string; gameName: string; tag: string; puuid: string }>();
  // Tab state synced with URL search params (?tab=overview) for browser back/forward support
  const [activeTab, setTab] = useTabNavigation();

  const [account, setAccount] = useState<Account | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [ranked, setRanked] = useState<RankedEntry[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [tier, setTier] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  /** Fetches all player data in parallel. Called on mount and on manual refresh. */
  const load = useCallback(async (cancelled = { current: false }) => {
    if (!region || (!puuidParam && (!gameName || !tag))) return;

    setStatus("loading");
    setErrorMsg("");
    setAccount(null);
    setMatches([]);
    setStats(null);
    setRanked([]);
    setIsFav(false);
    setHasMore(true);

    try {
      const [acc, tierData] = await Promise.all([
        puuidParam
          ? fetchAccountByPuuid(puuidParam, region)
          : fetchAccount(gameName!, tag!, region),
        fetchTier().catch(() => ({ tier: 0 })),
      ]);
      if (cancelled.current) return;
      setAccount(acc);
      setTier(tierData.tier);

      const matchCount = tierData.tier === 1 ? 10 : 10;
      const [matchData, statsData, rankedData, favStatus] = await Promise.all([
        fetchMatchSummaries(acc.puuid, region, matchCount),
        fetchStats(acc.puuid, region, 10),
        fetchRanked(acc.puuid, region).catch((e) => { console.error("Ranked fetch failed:", e); return []; }),
        checkIsFavorite(acc.puuid),
      ]);

      if (cancelled.current) return;
      const matchList = Array.isArray(matchData) ? matchData : [];
      setMatches(matchList);
      setHasMore(matchList.length >= 10);
      setStats(statsData);
      setRanked(Array.isArray(rankedData) ? rankedData : []);
      setIsFav(favStatus);
      setStatus("done");
    } catch (e: unknown) {
      if (cancelled.current) return;
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [region, gameName, tag, puuidParam]);

  useEffect(() => {
    const cancelled = { current: false };
    load(cancelled);
    return () => { cancelled.current = true; };
  }, [load]);

  /** Re-fetches all data when the refresh button is clicked in ProfileHeader. */
  const handleRefresh = () => {
    load();
  };

  /** Fetches the next 10 matches starting at the current offset and appends to the list. */
  const loadMore = async () => {
    if (!account || !region || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const newMatches = await fetchMatchSummaries(account.puuid, region, 10, matches.length);
      const list = Array.isArray(newMatches) ? newMatches : [];
      setMatches((prev) => [...prev, ...list]);
      if (list.length < 10) setHasMore(false);
    } catch (e) {
      console.error("Failed to load more matches:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  /** Toggles the player's favorite status via the backend API. */
  const toggleFavorite = async () => {
    if (!account || !region) return;
    try {
      if (isFav) {
        await removeFavorite(account.puuid);
        setIsFav(false);
      } else {
        await addFavorite(account.puuid, account.gameName, account.tagLine, region);
        setIsFav(true);
      }
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    }
  };

  return (
    <div style={styles.page}>
      {/* Top bar with search */}
      <div style={styles.topBar}>
        <span style={styles.logo} onClick={() => window.location.href = "/"}>LoL Tracker</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SearchBar
            compact
            initialRegion={region as Region}
            initialGameName={decodeURIComponent(gameName || "")}
            initialTag={decodeURIComponent(tag || "")}
          />
        </div>
        <div style={{ flexShrink: 0 }}>
          {getAuthToken() ? (
            <button
              onClick={() => { setAuthToken(null); setTier(0); }}
              style={styles.authBtn}
            >
              Log out
            </button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={styles.authBtn}>
              Log in
            </button>
          )}
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          onSuccess={async () => {
            const d = await fetchTier().catch(() => ({ tier: 0 }));
            setTier(d.tier);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Content */}
      <div style={styles.content}>
        {status === "loading" && (
          <div style={styles.loadingBox}>Loading player data...</div>
        )}

        {status === "error" && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {status === "done" && account && (
          <>
            <ProfileHeader
              account={account}
              region={region!}
              isFav={isFav}
              onToggleFavorite={toggleFavorite}
              onRefresh={handleRefresh}
            />

            <TabBar activeTab={activeTab} onTabChange={setTab} />

            {/* Conditionally render the active tab's content */}
            {activeTab === "overview" && (
              <OverviewTab stats={stats} matches={matches} ranked={ranked} />
            )}
            {activeTab === "performance" && (
              <PerformanceTab puuid={account.puuid} />
            )}
            {activeTab === "champions" && (
              <ChampionsTab puuid={account.puuid} />
            )}
            {activeTab === "match-history" && (
              <>
                {tier === 0 && (
                  <div style={styles.upgradeBanner}>
                    FREE tier: 20 matches max, no AI analysis.{" "}
                    {getAuthToken() ? (
                      <button style={styles.upgradeBtn} onClick={async () => { const d = await upgradeTier(); setTier(d.tier); }}>
                        Upgrade to PRO
                      </button>
                    ) : (
                      <button style={{ ...styles.upgradeBtn, background: "#4f46e5" }} onClick={() => setShowAuthModal(true)}>
                        Log in to upgrade
                      </button>
                    )}
                  </div>
                )}
                <MatchHistoryTab
                  matches={matches}
                  region={region!}
                  puuid={account.puuid}
                  gameName={account.gameName}
                  onLoadMore={loadMore}
                  isLoadingMore={isLoadingMore}
                  hasMore={hasMore}
                  tier={tier}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Styles: dark slate theme, wider content area (1060px) for 2-column tab layouts ---
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "12px 24px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
  },
  logo: {
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  content: {
    maxWidth: 1060,
    margin: "0 auto",
    padding: "30px 20px",
  },
  loadingBox: {
    textAlign: "center",
    padding: 40,
    opacity: 0.6,
    fontSize: 16,
  },
  errorBox: {
    background: "#7f1d1d",
    color: "#fecaca",
    padding: 15,
    borderRadius: 8,
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
  authBtn: {
    background: "transparent",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
};
