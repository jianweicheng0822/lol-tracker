import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaderboardPage from "./LeaderboardPage";
import * as api from "../api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api", () => ({
  fetchLeaderboard: vi.fn(),
}));

const MOCK_ENTRIES = [
  { summonerName: "Faker", tier: "CHALLENGER", rank: "I", leaguePoints: 1500, wins: 200, losses: 80, winRate: 71.4 },
  { summonerName: "Zeus", tier: "CHALLENGER", rank: "I", leaguePoints: 1200, wins: 180, losses: 90, winRate: 66.7 },
  { summonerName: "Gumayusi", tier: "CHALLENGER", rank: "I", leaguePoints: 1000, wins: 150, losses: 100, winRate: 60.0 },
];

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchLeaderboard).mockResolvedValue(MOCK_ENTRIES);
  });

  it("shows loading state initially", () => {
    vi.mocked(api.fetchLeaderboard).mockReturnValue(new Promise(() => {}));
    render(<LeaderboardPage />);
    expect(screen.getByText("Loading leaderboard...")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(api.fetchLeaderboard).mockRejectedValue(new Error("Network error"));
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("renders leaderboard entries after loading", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });
    expect(screen.getByText("Zeus")).toBeInTheDocument();
    expect(screen.getByText("Gumayusi")).toBeInTheDocument();
  });

  it("displays LP values", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("1,500 LP")).toBeInTheDocument();
    });
    expect(screen.getByText("1,200 LP")).toBeInTheDocument();
    expect(screen.getByText("1,000 LP")).toBeInTheDocument();
  });

  it("displays win rate values", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("71.4%")).toBeInTheDocument();
    });
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("displays win/loss records", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("200W 80L")).toBeInTheDocument();
    });
  });

  it("displays rank numbers", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("fetches challenger NA by default", () => {
    render(<LeaderboardPage />);
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "challenger");
  });

  it("refetches when tier tab is clicked", async () => {
    const user = userEvent.setup();
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Grandmaster"));
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "grandmaster");
  });

  it("refetches when region is changed", async () => {
    const user = userEvent.setup();
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue("NA");
    await user.selectOptions(select, "KR");
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("KR", "RANKED_SOLO_5x5", "challenger");
  });

  it("refetches when queue is changed to Flex", async () => {
    const user = userEvent.setup();
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue("Solo/Duo");
    await user.selectOptions(select, "RANKED_FLEX_SR");
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_FLEX_SR", "challenger");
  });

  it("navigates home when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<LeaderboardPage />);
    await user.click(screen.getByText(/Home/));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders the page title", () => {
    vi.mocked(api.fetchLeaderboard).mockReturnValue(new Promise(() => {}));
    render(<LeaderboardPage />);
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
  });

  it("renders all three tier tabs", () => {
    vi.mocked(api.fetchLeaderboard).mockReturnValue(new Promise(() => {}));
    render(<LeaderboardPage />);
    expect(screen.getByText("Challenger")).toBeInTheDocument();
    expect(screen.getByText("Grandmaster")).toBeInTheDocument();
    expect(screen.getByText("Master")).toBeInTheDocument();
  });

  it("renders table headers", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText("LP")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("W / L")).toBeInTheDocument();
  });

  it("shows no entries message for empty result", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue([]);
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("No entries found.")).toBeInTheDocument();
    });
  });
});
