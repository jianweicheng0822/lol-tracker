import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./HomePage";
import * as api from "../api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api", () => ({
  fetchFavorites: vi.fn(),
  fetchLeaderboard: vi.fn(),
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
}));

vi.mock("../components/SearchBar", () => ({
  default: () => <div data-testid="search-bar">SearchBar</div>,
}));

vi.mock("../components/AuthModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("../components/FavoritesList", () => ({
  default: ({ favorites }: { favorites: unknown[] }) => (
    <div data-testid="favorites-list">{favorites.length} favorites</div>
  ),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchFavorites).mockResolvedValue([]);
    vi.mocked(api.fetchLeaderboard).mockResolvedValue([]);
    vi.mocked(api.getAuthToken).mockReturnValue(null);
  });

  it("renders the title and subtitle", () => {
    render(<HomePage />);
    expect(screen.getByText("LoL Tracker")).toBeInTheDocument();
    expect(screen.getByText("Track LP progression, analyze match history, and discover champion trends.")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    render(<HomePage />);
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("renders demo player buttons", () => {
    render(<HomePage />);
    expect(screen.getByText("duoking1 #freex")).toBeInTheDocument();
    expect(screen.getByText("EDG Viper #NA11")).toBeInTheDocument();
  });

  it("shows Log in button when not authenticated", () => {
    render(<HomePage />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
  });

  it("shows Log out button when authenticated", () => {
    vi.mocked(api.getAuthToken).mockReturnValue("some-token");
    render(<HomePage />);
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("loads favorites on mount", () => {
    render(<HomePage />);
    expect(api.fetchFavorites).toHaveBeenCalled();
  });

  it("renders favorites list component", () => {
    render(<HomePage />);
    expect(screen.getByTestId("favorites-list")).toBeInTheDocument();
  });

  it("renders leaderboard nav link", () => {
    render(<HomePage />);
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
  });

  it("navigates to leaderboard when nav link is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<HomePage />);
    await user.click(screen.getByText("Leaderboard"));
    expect(mockNavigate).toHaveBeenCalledWith("/leaderboard");
  });

  it("fetches leaderboard preview on mount", () => {
    render(<HomePage />);
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "challenger");
  });

  it("renders leaderboard preview card when data loads", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue([
      { summonerName: "TopPlayer1", tier: "CHALLENGER", rank: "I", leaguePoints: 1500, wins: 200, losses: 80, winRate: 71.4 },
      { summonerName: "TopPlayer2", tier: "CHALLENGER", rank: "I", leaguePoints: 1200, wins: 180, losses: 90, winRate: 66.7 },
      { summonerName: "TopPlayer3", tier: "CHALLENGER", rank: "I", leaguePoints: 1000, wins: 150, losses: 100, winRate: 60.0 },
    ]);
    render(<HomePage />);
    const { waitFor } = await import("@testing-library/react");
    await waitFor(() => {
      expect(screen.getByText("Top Ranked Players")).toBeInTheDocument();
    });
    expect(screen.getByText("TopPlayer1")).toBeInTheDocument();
    expect(screen.getByText("TopPlayer2")).toBeInTheDocument();
    expect(screen.getByText("TopPlayer3")).toBeInTheDocument();
  });

  it("renders View Full Leaderboard button", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue([
      { summonerName: "P1", tier: "CHALLENGER", rank: "I", leaguePoints: 1500, wins: 200, losses: 80, winRate: 71.4 },
    ]);
    render(<HomePage />);
    const { waitFor } = await import("@testing-library/react");
    await waitFor(() => {
      expect(screen.getByText(/View Full Leaderboard/)).toBeInTheDocument();
    });
  });

  it("does not render leaderboard card when no data", () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue([]);
    render(<HomePage />);
    expect(screen.queryByText("Top Ranked Players")).not.toBeInTheDocument();
  });
});
