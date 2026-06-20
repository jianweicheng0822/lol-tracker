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
import ChampionsTab from "../components/tabs/ChampionsTab";
import { useTabNavigation } from "../hooks/useTabNavigation";
import { fetchAccount, fetchAccountByPuuid, fetchMatchSummaries, fetchStats, fetchRanked, checkIsFavorite, addFavorite, removeFavorite, fetchTier, getAuthToken, setAuthToken } from "../api";
import type { Region, Account, MatchSummary, PlayerStats, RankedEntry } from "../types";
import { computeStreak, computeClimbStatus } from "../utils/playerInsights";
import { COLORS } from "../utils/colors";

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

      const matchCount = 20;
      const [matchData, statsData, rankedData, favStatus] = await Promise.all([
        fetchMatchSummaries(acc.puuid, region, matchCount),
        fetchStats(acc.puuid, region, 20),
        fetchRanked(acc.puuid, region).catch((e) => { console.error("Ranked fetch failed:", e); return []; }),
        checkIsFavorite(acc.puuid),
      ]);

      if (cancelled.current) return;
      const matchList = Array.isArray(matchData) ? matchData : [];
      setMatches(matchList);
      setHasMore(matchList.length >= 20);
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
              streak={computeStreak(matches)}
              climbStatus={computeClimbStatus(ranked)}
            />

            <TabBar activeTab={activeTab} onTabChange={setTab} />

            {/* Conditionally render the active tab's content */}
            {activeTab === "overview" && (
              <OverviewTab
                stats={stats}
                matches={matches}
                ranked={ranked}
                region={region!}
                puuid={account.puuid}
                onLoadMore={loadMore}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                tier={tier}
                onTabChange={setTab}
                onShowAuth={() => setShowAuthModal(true)}
                onTierChange={setTier}
              />
            )}
            {activeTab === "champions" && (
              <ChampionsTab puuid={account.puuid} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Styles: black-gold theme ---
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#121210",
    color: COLORS.textPrimary,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "12px 24px",
    background: "#111110",
    borderBottom: "1px solid #1e1c18",
  },
  logo: {
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  content: {
    maxWidth: 1200,
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
    background: "#2d1111",
    color: "#E88A8A",
    padding: 15,
    borderRadius: 6,
  },
  authBtn: {
    background: "transparent",
    color: COLORS.textTertiary,
    border: "1px solid #1e1c18",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
};
