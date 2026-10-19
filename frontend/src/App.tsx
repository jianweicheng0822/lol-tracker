/**
 * @file App.tsx
 * @description Top-level route definitions mapping URL paths to page components.
 * @module frontend.root
 */
import { Routes, Route, useLocation } from "react-router-dom";
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

export default function App() {
  return (
    <main>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:region/:gameName/:tag" element={<KeyedPlayerPage />} />
      <Route path="/player/puuid/:region/:puuid" element={<KeyedPlayerPage />} />
      <Route path="/match/:region/:matchId" element={<MatchDetailPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/multi-search" element={<MultiSearchPage />} />
      <Route path="/live/:region/:gameName/:tag" element={<LiveMatchPage />} />
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
}
