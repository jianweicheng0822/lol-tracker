import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LiveMatchPage from "./LiveMatchPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ region: "NA", gameName: "TestPlayer", tag: "NA1" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("../utils/champion", () => ({
  loadChampionMap: vi.fn().mockResolvedValue({
    103: { id: "Ahri", name: "Ahri" },
    24: { id: "Jax", name: "Jax" },
    86: { id: "Garen", name: "Garen" },
  }),
}));

const MOCK_GAME = {
  gameId: 123456,
  gameMode: "CLASSIC",
  queueId: 420,
  gameStartTime: Date.now() - 300000,
  gameLength: 300,
  participants: [
    {
      puuid: "puuid-1",
      gameName: "BluePlayer1",
      tagLine: "NA1",
      championId: 103,
      teamId: 100,
      spell1Id: 4,
      spell2Id: 14,
      tier: "GOLD",
      rank: "II",
      leaguePoints: 45,
      wins: 50,
      losses: 40,
      winRate: 55.6,
    },
    {
      puuid: "puuid-2",
      gameName: "RedPlayer1",
      tagLine: "EUW",
      championId: 24,
      teamId: 200,
      spell1Id: 4,
      spell2Id: 12,
      tier: null,
      rank: null,
      leaguePoints: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    },
  ],
};

const mockFetchAccount = vi.fn();
const mockFetchLiveGame = vi.fn();

vi.mock("../api", () => ({
  fetchAccount: (...args: unknown[]) => mockFetchAccount(...args),
  fetchLiveGame: (...args: unknown[]) => mockFetchLiveGame(...args),
}));

describe("LiveMatchPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state on mount", () => {
    mockFetchAccount.mockReturnValue(new Promise(() => {}));
    render(<LiveMatchPage />);
    expect(screen.getByText("Loading live game...")).toBeInTheDocument();
  });

  it("renders both teams with participant details", async () => {
    mockFetchAccount.mockResolvedValue({ puuid: "test-puuid", gameName: "TestPlayer", tagLine: "NA1" });
    mockFetchLiveGame.mockResolvedValue(MOCK_GAME);

    render(<LiveMatchPage />);

    await waitFor(() => {
      expect(screen.getByText("BluePlayer1")).toBeInTheDocument();
    });

    expect(screen.getByText("RedPlayer1")).toBeInTheDocument();
    expect(screen.getByText("Blue Team")).toBeInTheDocument();
    expect(screen.getByText("Red Team")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Ranked Solo/Duo")).toBeInTheDocument();
  });

  it("shows rank for ranked participants and unranked for others", async () => {
    mockFetchAccount.mockResolvedValue({ puuid: "test-puuid", gameName: "TestPlayer", tagLine: "NA1" });
    mockFetchLiveGame.mockResolvedValue(MOCK_GAME);

    render(<LiveMatchPage />);

    await waitFor(() => {
      expect(screen.getByText(/Gold/)).toBeInTheDocument();
    });

    expect(screen.getByText("45 LP")).toBeInTheDocument();
    expect(screen.getByText("55.6%")).toBeInTheDocument();
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("navigates to player profile on name click", async () => {
    mockFetchAccount.mockResolvedValue({ puuid: "test-puuid", gameName: "TestPlayer", tagLine: "NA1" });
    mockFetchLiveGame.mockResolvedValue(MOCK_GAME);

    render(<LiveMatchPage />);

    await waitFor(() => {
      expect(screen.getByText("BluePlayer1")).toBeInTheDocument();
    });

    await user.click(screen.getByText("BluePlayer1"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/BluePlayer1/NA1");
  });

  it("shows error when player is not in game", async () => {
    mockFetchAccount.mockResolvedValue({ puuid: "test-puuid", gameName: "TestPlayer", tagLine: "NA1" });
    mockFetchLiveGame.mockResolvedValue(null);

    render(<LiveMatchPage />);

    await waitFor(() => {
      expect(screen.getByText("This player is not currently in a game.")).toBeInTheDocument();
    });

    expect(screen.getByText("Back to Profile")).toBeInTheDocument();
  });
});
