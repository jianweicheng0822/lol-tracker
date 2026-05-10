/**
 * @file App.tsx
 * @description Top-level route definitions mapping URL paths to page components.
 * @module frontend.root
 */
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PlayerPage from "./pages/PlayerPage";
import MatchDetailPage from "./pages/MatchDetailPage";

/**
 * Define the application's client-side routes.
 *
 * @returns The route tree rendered by React Router.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:region/:gameName/:tag" element={<PlayerPage />} />
      <Route path="/match/:region/:matchId" element={<MatchDetailPage />} />
    </Routes>
  );
}
