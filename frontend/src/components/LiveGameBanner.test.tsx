import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LiveGameBanner from "./LiveGameBanner";
import type { LiveGame } from "../types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../utils/champion", () => ({
  loadChampionMap: vi.fn().mockResolvedValue({ 103: "Ahri", 24: "Jax", 86: "Garen" }),
  getChampionName: vi.fn((id: number) => {
    const map: Record<number, string> = { 103: "Ahri", 24: "Jax", 86: "Garen" };
    return map[id] || `Champion ${id}`;
  }),
}));

const MOCK_GAME: LiveGame = {
  gameId: 123456,
  gameMode: "CLASSIC",
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

describe("LiveGameBanner", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows LIVE indicator and game mode", () => {
    render(<LiveGameBanner game={MOCK_GAME} region="NA" />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText(/CLASSIC/)).toBeInTheDocument();
  });

  it("renders Blue Team and Red Team labels", () => {
    render(<LiveGameBanner game={MOCK_GAME} region="NA" />);
    expect(screen.getByText("Blue Team")).toBeInTheDocument();
    expect(screen.getByText("Red Team")).toBeInTheDocument();
  });

  it("renders player names", () => {
    render(<LiveGameBanner game={MOCK_GAME} region="NA" />);
    expect(screen.getByText("BluePlayer1")).toBeInTheDocument();
    expect(screen.getByText("RedPlayer1")).toBeInTheDocument();
  });

  it("shows rank for ranked players", () => {
    render(<LiveGameBanner game={MOCK_GAME} region="NA" />);
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
    expect(screen.getByText("55.6%")).toBeInTheDocument();
  });

  it("shows Unranked for players without rank", () => {
    render(<LiveGameBanner game={MOCK_GAME} region="NA" />);
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("navigates to player profile on name click", async () => {
    render(<LiveGameBanner game={MOCK_GAME} region="NA" />);
    await user.click(screen.getByText("BluePlayer1"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/BluePlayer1/NA1");
  });
});
