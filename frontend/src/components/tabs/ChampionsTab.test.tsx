import { render, screen, waitFor } from "@testing-library/react";
import ChampionsTab from "./ChampionsTab";
import { makeChampionStats } from "../../test/fixtures";

vi.mock("../../api", () => ({
  fetchChampionStats: vi.fn(),
}));

vi.mock("../../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  championIconUrl: (name: string) => `${name}.png`,
  hideOnError: vi.fn(),
}));

import { fetchChampionStats } from "../../api";

describe("ChampionsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading state", () => {
    vi.mocked(fetchChampionStats).mockReturnValue(new Promise(() => {}));
    render(<ChampionsTab puuid="test" />);
    expect(screen.getByText("Loading champion stats...")).toBeInTheDocument();
  });

  it("shows empty state when no champion data", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("No champion data available yet.")).toBeInTheDocument();
    });
  });

  it("renders champion cards with stats", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([
      makeChampionStats({ championName: "Ahri", winRate: 66.7, avgKda: 5.06 }),
      makeChampionStats({ championName: "Zed", winRate: 45, avgKda: 1.5, games: 10, wins: 4 }),
    ]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("Ahri")).toBeInTheDocument();
      expect(screen.getByText("Zed")).toBeInTheDocument();
    });
  });

  it("color-codes win rate (green for >=60, red for <50)", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([
      makeChampionStats({ championName: "High", winRate: 70 }),
      makeChampionStats({ championName: "Low", winRate: 40 }),
    ]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("70%")).toHaveStyle({ color: "#D4A017" });
      expect(screen.getByText("40%")).toHaveStyle({ color: "#C44040" });
    });
  });

  it("color-codes KDA (green for >=3, red for <2)", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([
      makeChampionStats({ championName: "GoodKda", avgKda: 4.0 }),
      makeChampionStats({ championName: "BadKda", avgKda: 1.5 }),
    ]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("4.00")).toHaveStyle({ color: "#D4A017" });
      expect(screen.getByText("1.50")).toHaveStyle({ color: "#C44040" });
    });
  });

  it("handles API error gracefully", async () => {
    vi.mocked(fetchChampionStats).mockRejectedValue(new Error("fail"));
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("No champion data available yet.")).toBeInTheDocument();
    });
  });
});
