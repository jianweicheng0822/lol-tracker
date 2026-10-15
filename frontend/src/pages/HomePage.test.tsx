import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
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
}));

// Login state comes from useAuth; tests flip it to simulate logging in or out
const authState = { isLoggedIn: false, username: null as string | null };
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => authState,
}));

// The header (nav, log in/out) has its own tests
vi.mock("../components/AppHeader", () => ({
  default: () => <header data-testid="app-header" />,
}));

vi.mock("../components/SearchBar", () => ({
  default: () => <div data-testid="search-bar">SearchBar</div>,
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
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: [], totalEntries: 0 });
    vi.mocked(api.getAuthToken).mockReturnValue(null);
    authState.isLoggedIn = false;
  });

  function logIn() {
    authState.isLoggedIn = true;
    vi.mocked(api.getAuthToken).mockReturnValue("some-token");
  }

  it("renders the title and subtitle", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "LoL Tracker" })).toBeInTheDocument();
    expect(screen.getByText("Track LP progression, analyze match history, and discover champion trends.")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    render(<HomePage />);
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("renders demo player buttons", () => {
    render(<HomePage />);
    expect(screen.getByText("duoking1 #freex")).toBeInTheDocument();
    expect(screen.getByText("C9 Loki #kr3")).toBeInTheDocument();
  });

  it("renders the shared header", () => {
    render(<HomePage />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("loads favorites on mount when authenticated", () => {
    logIn();
    render(<HomePage />);
    expect(api.fetchFavorites).toHaveBeenCalled();
  });

  it("skips loading favorites when not authenticated", () => {
    render(<HomePage />);
    expect(api.fetchFavorites).not.toHaveBeenCalled();
  });

  it("loads favorites after logging in from the header, and hides them after logging out", async () => {
    vi.mocked(api.fetchFavorites).mockResolvedValue([{ puuid: "p1" }] as never);
    const { rerender } = render(<HomePage />);
    expect(screen.getByTestId("favorites-list")).toHaveTextContent("0 favorites");

    logIn();
    await act(async () => rerender(<HomePage />));
    expect(api.fetchFavorites).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("favorites-list")).toHaveTextContent("1 favorites");

    authState.isLoggedIn = false;
    await act(async () => rerender(<HomePage />));
    expect(screen.getByTestId("favorites-list")).toHaveTextContent("0 favorites");
  });

  it("renders favorites list component", () => {
    render(<HomePage />);
    expect(screen.getByTestId("favorites-list")).toBeInTheDocument();
  });

  it("fetches leaderboard preview on mount", () => {
    render(<HomePage />);
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "challenger", 0, 3);
  });

  it("renders leaderboard preview card when data loads", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: [
      { summonerName: "TopPlayer1", tier: "CHALLENGER", rank: "I", leaguePoints: 1500, wins: 200, losses: 80, winRate: 71.4 },
      { summonerName: "TopPlayer2", tier: "CHALLENGER", rank: "I", leaguePoints: 1200, wins: 180, losses: 90, winRate: 66.7 },
      { summonerName: "TopPlayer3", tier: "CHALLENGER", rank: "I", leaguePoints: 1000, wins: 150, losses: 100, winRate: 60.0 },
    ], totalEntries: 3 });
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
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: [
      { summonerName: "P1", tier: "CHALLENGER", rank: "I", leaguePoints: 1500, wins: 200, losses: 80, winRate: 71.4 },
    ], totalEntries: 1 });
    render(<HomePage />);
    const { waitFor } = await import("@testing-library/react");
    await waitFor(() => {
      expect(screen.getByText(/View Full Leaderboard/)).toBeInTheDocument();
    });
  });

  it("does not render leaderboard card when no data", () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: [], totalEntries: 0 });
    render(<HomePage />);
    expect(screen.queryByText("Top Ranked Players")).not.toBeInTheDocument();
  });
});
