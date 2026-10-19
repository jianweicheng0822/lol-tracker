/**
 * @file App.tsx
 * @description Top-level route definitions mapping URL paths to page components.
 * @module frontend.root
 */
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { REGIONS, type Region } from "./types";
import HomePage from "./pages/HomePage";
import PlayerPage from "./pages/PlayerPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import { CheckoutSuccessPage, CheckoutCancelPage } from "./pages/CheckoutResultPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import MultiSearchPage from "./pages/MultiSearchPage";
import LiveMatchPage from "./pages/LiveMatchPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import NotFoundPage from "./pages/NotFoundPage";

/**
 * A player page keyed by its path, so opening another player (search, "Try in: EUW", a link on
 * the page) starts from fresh state. Tab changes only touch the query string and keep it.
 */
function KeyedPlayerPage() {
  const { pathname } = useLocation();
  return <PlayerPage key={pathname} />;
}

/**
 * Check the :region segment before rendering a page: a lowercase one ("na") redirects to the
 * canonical uppercase URL, and an unknown one shows the 404 page instead of an API error.
 */
function WithRegion({ children }: { children: React.ReactNode }) {
  const { region = "" } = useParams();
  const { pathname, search, hash } = useLocation();
  const upper = region.toUpperCase();
  if (!REGIONS.includes(upper as Region)) return <NotFoundPage />;
  if (upper !== region) {
    const fixed = pathname.replace(`/${region}/`, `/${upper}/`);
    return <Navigate to={fixed + search + hash} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <main>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:region/:gameName/:tag" element={<WithRegion><KeyedPlayerPage /></WithRegion>} />
      <Route path="/player/puuid/:region/:puuid" element={<WithRegion><KeyedPlayerPage /></WithRegion>} />
      <Route path="/match/:region/:matchId" element={<WithRegion><MatchDetailPage /></WithRegion>} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/multi-search" element={<MultiSearchPage />} />
      <Route path="/live/:region/:gameName/:tag" element={<WithRegion><LiveMatchPage /></WithRegion>} />
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
}
