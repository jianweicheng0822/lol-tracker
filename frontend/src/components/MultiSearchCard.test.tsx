import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MultiSearchCard from "./MultiSearchCard";
import * as api from "../api";
import type { MatchSummary, MultiSearchPlayer } from "../types";

vi.mock("../api", () => ({ fetchMatchSummaries: vi.fn() }));
vi.mock("../utils/champion", () => ({
  loadChampionMap: vi.fn().mockResolvedValue({ 103: { id: "Ahri", name: "Ahri" }, 238: { id: "Zed", name: "Zed" } }),
}));

const player: MultiSearchPlayer = {
  gameName: "Faker",
  tagLine: "KR1",
  puuid: "p1",
  profileIconId: 1,
  rankedEntries: [{ queueType: "RANKED_SOLO_5x5", tier: "CHALLENGER", rank: "I", leaguePoints: 1500, wins: 300, losses: 200 }],
  topChampions: [
    { championId: 103, championLevel: 7, championPoints: 1_234_567 },
    { championId: 238, championLevel: 6, championPoints: 250_000 },
  ],
  error: null,
};

function game(matchId: string, win: boolean): MatchSummary {
  return { matchId, win, championName: "Ahri", kills: 5, deaths: 2, assists: 7 } as MatchSummary;
}

function renderCard(p: MultiSearchPlayer = player) {
  return render(
    <MemoryRouter>
      <MultiSearchCard player={p} region="NA" />
    </MemoryRouter>,
  );
}

describe("MultiSearchCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the last 5 ranked solo games and shows W/L with a win rate", async () => {
    vi.mocked(api.fetchMatchSummaries).mockResolvedValue([
      game("m1", true), game("m2", true), game("m3", false), game("m4", true), game("m5", false),
    ]);
    renderCard();

    expect(screen.getByLabelText("Loading recent games")).toBeInTheDocument();
    expect(await screen.findByText("60%")).toBeInTheDocument();
    expect(screen.getAllByText("W")).toHaveLength(3);
    expect(screen.getAllByText("L")).toHaveLength(2);
    expect(api.fetchMatchSummaries).toHaveBeenCalledWith("p1", "NA", 5, 0, 420);
  });

  it("says so when there are no recent ranked games", async () => {
    vi.mocked(api.fetchMatchSummaries).mockResolvedValue([]);
    renderCard();
    expect(await screen.findByText("No recent ranked games")).toBeInTheDocument();
  });

  it("keeps the card usable when recent games can't be loaded", async () => {
    vi.mocked(api.fetchMatchSummaries).mockRejectedValue(new Error("Too many requests"));
    renderCard();
    expect(await screen.findByText("Unavailable right now")).toBeInTheDocument();
    expect(screen.getByText("Challenger")).toBeInTheDocument();
  });

  it("shows the player's mains with compact mastery points", async () => {
    vi.mocked(api.fetchMatchSummaries).mockResolvedValue([]);
    renderCard();
    expect(await screen.findByAltText("Ahri")).toBeInTheDocument();
    expect(screen.getByAltText("Zed")).toBeInTheDocument();
    expect(screen.getByText("1.2M")).toBeInTheDocument();
    expect(screen.getByText("250k")).toBeInTheDocument();
  });

  it("hides the mains row when mastery is unavailable", async () => {
    vi.mocked(api.fetchMatchSummaries).mockResolvedValue([]);
    renderCard({ ...player, topChampions: [] });
    await screen.findByText("No recent ranked games");
    expect(screen.queryByText("Mains")).not.toBeInTheDocument();
  });

  it("doesn't load recent games for a player that wasn't found", () => {
    renderCard({ ...player, puuid: null, error: "Player not found" });
    expect(screen.getByText("Player not found")).toBeInTheDocument();
    expect(api.fetchMatchSummaries).not.toHaveBeenCalled();
  });
});
