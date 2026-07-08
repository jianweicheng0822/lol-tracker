/**
 * @file App.tsx
 * @description Top-level route definitions mapping URL paths to page components.
 * @module frontend.root
 */
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PlayerPage from "./pages/PlayerPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import { CheckoutSuccessPage, CheckoutCancelPage } from "./pages/CheckoutResultPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import MultiSearchPage from "./pages/MultiSearchPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:region/:gameName/:tag" element={<PlayerPage />} />
      <Route path="/player/puuid/:region/:puuid" element={<PlayerPage />} />
      <Route path="/match/:region/:matchId" element={<MatchDetailPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/multi-search" element={<MultiSearchPage />} />
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
    </Routes>
  );
}
