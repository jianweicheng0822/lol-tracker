/** Root component — defines client-side routes for Home, Player, and Match Detail pages. */
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PlayerPage from "./pages/PlayerPage";
import MatchDetailPage from "./pages/MatchDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/player/:region/:gameName/:tag" element={<PlayerPage />} />
      <Route path="/match/:region/:matchId" element={<MatchDetailPage />} />
    </Routes>
  );
}