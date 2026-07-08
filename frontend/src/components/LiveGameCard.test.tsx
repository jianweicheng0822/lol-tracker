import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LiveGameCard from "./LiveGameCard";
import type { LiveGame } from "../types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../utils/champion", () => ({
  loadChampionMap: vi.fn().mockResolvedValue({
    103: { id: "Ahri", name: "Ahri" },
    24: { id: "Jax", name: "Jax" },
  }),
}));

const MOCK_GAME: LiveGame = {
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

describe("LiveGameCard", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows not-in-game message and Check Again button when game is null", () => {
    const onCheckAgain = vi.fn();
    render(
      <LiveGameCard game={null} region="NA" gameName="Test" tag="NA1" onCheckAgain={onCheckAgain} />
    );
    expect(screen.getByText("Not currently in a game")).toBeInTheDocument();
    expect(screen.getByText("Check Again")).toBeInTheDocument();
  });

  it("calls onCheckAgain when Check Again is clicked", async () => {
    const onCheckAgain = vi.fn();
    render(
      <LiveGameCard game={null} region="NA" gameName="Test" tag="NA1" onCheckAgain={onCheckAgain} />
    );
    await user.click(screen.getByText("Check Again"));
    expect(onCheckAgain).toHaveBeenCalledTimes(1);
  });

  it("shows LIVE indicator and queue name when in game", () => {
    render(
      <LiveGameCard game={MOCK_GAME} region="NA" gameName="BluePlayer1" tag="NA1" onCheckAgain={vi.fn()} />
    );
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Ranked Solo/Duo")).toBeInTheDocument();
  });

  it("shows View Live Match button that navigates to correct URL", async () => {
    render(
      <LiveGameCard game={MOCK_GAME} region="NA" gameName="BluePlayer1" tag="NA1" onCheckAgain={vi.fn()} />
    );
    const btn = screen.getByText("View Live Match");
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith("/live/NA/BluePlayer1/NA1");
  });

  it("renders champion icons for both teams", () => {
    render(
      <LiveGameCard game={MOCK_GAME} region="NA" gameName="BluePlayer1" tag="NA1" onCheckAgain={vi.fn()} />
    );
    const icons = screen.getAllByRole("img");
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });
});
