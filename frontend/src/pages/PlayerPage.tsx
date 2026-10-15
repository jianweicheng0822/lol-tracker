/**
 * @file PlayerPage.tsx
 * @description Tabbed player dashboard with ranked info, stats, match history, and trends.
 * @module frontend.pages
 *
 * Fetch account, matches, stats, ranked, and favorite status in parallel on mount.
 * Support tabbed navigation via URL search params (?tab=overview).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AuthModal from "../components/AuthModal";
import Toast from "../components/Toast";
import ProfileHeader from "../components/ProfileHeader";
import TabBar from "../components/TabBar";
import OverviewTab from "../components/tabs/OverviewTab";
import ChampionsTab from "../components/tabs/ChampionsTab";
import { useTabNavigation } from "../hooks/useTabNavigation";
import { useAuth } from "../hooks/useAuth";
import { fetchAccount, fetchAccountByPuuid, fetchMatchSummaries, fetchStats, fetchRanked, checkIsFavorite, addFavorite, removeFavorite, fetchTier, fetchLiveGame, getAuthToken, setAuthToken, addSearchHistory, AuthRequiredError, PlayerNotFoundError } from "../api";
import { addLocalEntry } from "../utils/searchHistory";
import type { Region, Account, MatchSummary, PlayerStats, RankedEntry, LiveGame } from "../types";
import { REGIONS } from "../types";
import LiveGameCard from "../components/LiveGameCard";
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
  const [liveGame, setLiveGame] = useState<LiveGame | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const favoriteAfterLogin = useRef(false);

  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  // The player doesn't exist in this region (vs. a network/server error)
  const [notFound, setNotFound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  // Bumped on refresh so tabs with their own data (Champions) refetch while keeping their filters
  const [refreshToken, setRefreshToken] = useState(0);

  /**
   * Fetches all player data in parallel. Called on mount and on manual refresh.
   * A silent refresh keeps the current data on screen (no full-page loading state) and only
   * swaps it out once the new data arrives; if it fails, the old data stays.
   */
  const load = useCallback(async (cancelled = { current: false }, silent = false) => {
    if (!region || (!puuidParam && (!gameName || !tag))) return;

    if (silent) {
      setIsRefreshing(true);
    } else {
      setStatus("loading");
      setErrorMsg("");
      setNotFound(false);
      setAccount(null);
      setMatches([]);
      setStats(null);
      setRanked([]);
      setIsFav(false);
      setLiveGame(null);
      setHasMore(true);
    }

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

      // Save canonical gameName/tagLine to search history (already done if this is a refresh)
      if (!silent) {
        try {
          if (getAuthToken()) {
            addSearchHistory(acc.gameName, acc.tagLine, region).catch(() => {});
          } else {
            addLocalEntry({ region, gameName: acc.gameName, tagLine: acc.tagLine, searchedAt: Date.now() });
          }
        } catch {
          // ignore search history errors
        }
      }

      const matchCount = 20;
      // Fetch matches first so their details populate the Redis cache,
      // then stats can reuse the cached match data instead of re-fetching.
      const [matchData, rankedData, favStatus, liveGameData] = await Promise.all([
        fetchMatchSummaries(acc.puuid, region, matchCount),
        fetchRanked(acc.puuid, region).catch((e) => { console.error("Ranked fetch failed:", e); return []; }),
        getAuthToken() ? checkIsFavorite(acc.puuid) : Promise.resolve(false),
        fetchLiveGame(acc.puuid, region).catch(() => null),
      ]);

      if (cancelled.current) return;

      const statsData = await fetchStats(acc.puuid, region, 20);

      if (cancelled.current) return;
      const matchList = Array.isArray(matchData) ? matchData : [];
      setMatches(matchList);
      setHasMore(matchList.length >= 20);
      setStats(statsData);
      setRanked(Array.isArray(rankedData) ? rankedData : []);
      setIsFav(favStatus);
      setLiveGame(liveGameData || null);
      setStatus("done");
      setLastUpdated(Date.now());
    } catch (e: unknown) {
      if (cancelled.current) return;
      if (silent) {
        // Keep showing what we had rather than replacing the page with an error
        setToastMsg("Couldn't refresh. Showing the previous data.");
      } else {
        setStatus("error");
        setNotFound(e instanceof PlayerNotFoundError);
        setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      if (silent) setIsRefreshing(false);
    }
  }, [region, gameName, tag, puuidParam]);

  useEffect(() => {
    const cancelled = { current: false };
    load(cancelled);
    return () => { cancelled.current = true; };
  }, [load]);

  // Logging in or out (from the header, the favorite prompt, or another tab) changes what this
  // page may show: PRO features depend on the tier and the star on the favorite status.
  const { isLoggedIn } = useAuth();
  const prevLoggedIn = useRef(isLoggedIn);
  useEffect(() => {
    if (prevLoggedIn.current === isLoggedIn) return;
    prevLoggedIn.current = isLoggedIn;
    if (!isLoggedIn) {
      setTier(0);
      setIsFav(false);
      return;
    }
    fetchTier().then((d) => setTier(d.tier)).catch(() => setTier(0));
    if (account) checkIsFavorite(account.puuid).then(setIsFav).catch(() => {});
  }, [isLoggedIn, account]);

  /** The same player's page in another region (used by "Try in: ..." when they weren't found). */
  const playerPathIn = (otherRegion: Region) =>
    puuidParam
      ? `/player/puuid/${otherRegion}/${encodeURIComponent(puuidParam)}`
      : `/player/${otherRegion}/${encodeURIComponent(gameName ?? "")}/${encodeURIComponent(tag ?? "")}`;

  /** Refreshes in place when the refresh button is clicked in ProfileHeader. */
  const handleRefresh = () => {
    if (isRefreshing) return;
    setRefreshToken((t) => t + 1);
    load(undefined, true);
  };

  /** Re-checks live game status when the user clicks "Check Again". */
  const handleCheckAgain = async () => {
    if (!account || !region || isCheckingLive) return;
    setIsCheckingLive(true);
    try {
      const data = await fetchLiveGame(account.puuid, region);
      setLiveGame(data || null);
    } catch {
      setLiveGame(null);
    } finally {
      setIsCheckingLive(false);
    }
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

  /** Opens the login modal and remembers to favorite this player once the user logs in. */
  const promptLoginToFavorite = () => {
    favoriteAfterLogin.current = true;
    setToastMsg("Log in to save favorites");
    setShowAuthModal(true);
  };

  /** Toggles the player's favorite status via the backend API. */
  const toggleFavorite = async () => {
    if (!account || !region) return;
    if (!getAuthToken()) {
      promptLoginToFavorite();
      return;
    }
    try {
      if (isFav) {
        await removeFavorite(account.puuid);
        setIsFav(false);
        setToastMsg("Removed from favorites");
      } else {
        await addFavorite(account.puuid, account.gameName, account.tagLine, region);
        setIsFav(true);
        setToastMsg("Added to favorites");
      }
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        // Token expired: clear it so the UI reflects the logged-out state
        setAuthToken(null);
        setTier(0);
        promptLoginToFavorite();
        return;
      }
      console.error("Failed to toggle favorite:", e);
      setToastMsg(isFav ? "Couldn't remove favorite. Please try again." : "Couldn't add favorite. Please try again.");
    }
  };

  /** Completes a favorite the user tried to add before logging in. */
  const completePendingFavorite = async () => {
    if (!account || !region) return;
    try {
      if (!(await checkIsFavorite(account.puuid))) {
        await addFavorite(account.puuid, account.gameName, account.tagLine, region);
      }
      setIsFav(true);
      setToastMsg("Added to favorites");
    } catch (e) {
      console.error("Failed to add favorite after login:", e);
      setToastMsg("Couldn't add favorite. Please try again.");
    }
  };

  return (
    <div style={styles.page}>
      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
      <AppHeader
        // Prefer the loaded account: /player/puuid/... URLs have no name or tag to show
        searchDefaults={{
          region: region as Region,
          gameName: account?.gameName ?? decodeURIComponent(gameName || ""),
          tag: account?.tagLine ?? decodeURIComponent(tag || ""),
        }}
      />

      {/* Opened by the Favorite button when logged out; logging in from the header goes through AppHeader */}
      {showAuthModal && (
        <AuthModal
          onSuccess={async () => {
            // Read the flag synchronously: AuthModal calls onClose right after onSuccess without awaiting
            const pendingFavorite = favoriteAfterLogin.current;
            favoriteAfterLogin.current = false;
            setToastMsg("Logged in successfully");
            if (pendingFavorite) await completePendingFavorite();
          }}
          onClose={() => {
            setShowAuthModal(false);
            favoriteAfterLogin.current = false;
          }}
        />
      )}

      {/* Content */}
      <div style={styles.content}>
        {status === "loading" && (
          <div style={styles.loadingBox}>Loading player data...</div>
        )}

        {status === "error" && notFound && (
          <div style={styles.notFoundBox} role="status">
            <h2 style={styles.notFoundTitle}>
              {puuidParam ? (
                <>This player wasn't found in {region}</>
              ) : (
                <>No player named <span style={{ color: COLORS.gold }}>{gameName}#{tag}</span> found in {region}</>
              )}
            </h2>
            <p style={styles.notFoundText}>
              Riot IDs belong to one server, so the region has to match. Also check the spelling; the tag
              is the part after # (e.g. NA1).
            </p>
            <div style={styles.regionRow}>
              <span style={styles.regionRowLabel}>Try in:</span>
              {REGIONS.filter((r) => r !== region).map((r) => (
                <button key={r} style={styles.regionBtn} onClick={() => navigate(playerPathIn(r))}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "error" && !notFound && (
          <div style={styles.errorBox} role="alert">
            <div><strong>Couldn't load this player.</strong> {errorMsg}</div>
            <button style={styles.retryBtn} onClick={() => load()}>Retry</button>
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
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
              streak={computeStreak(matches)}
              climbStatus={computeClimbStatus(matches)}
            />

            <LiveGameCard
              game={liveGame}
              region={region!}
              gameName={account.gameName}
              tag={account.tagLine}
              onCheckAgain={handleCheckAgain}
              isChecking={isCheckingLive}
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
              <ChampionsTab puuid={account.puuid} refreshToken={refreshToken} />
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  retryBtn: {
    background: "transparent",
    border: "1px solid rgba(232,138,138,0.4)",
    color: "#E88A8A",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  notFoundBox: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 10,
    padding: "28px 24px",
    textAlign: "center",
    maxWidth: 640,
    margin: "40px auto",
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 10px",
  },
  notFoundText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  regionRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  regionRowLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  regionBtn: {
    background: "rgba(212,160,23,0.1)",
    border: "1px solid rgba(212,160,23,0.3)",
    color: COLORS.gold,
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
