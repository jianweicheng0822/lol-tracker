import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("color-codes win rate using shared winRateColor", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([
      makeChampionStats({ championName: "High", winRate: 70 }),
      makeChampionStats({ championName: "Low", winRate: 40 }),
    ]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("70%")).toHaveStyle({ color: "#3A8FD6" });
      expect(screen.getByText("40%")).toHaveStyle({ color: "#E84057" });
    });
  });

  it("color-codes KDA using shared kdaColor", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([
      makeChampionStats({ championName: "GoodKda", avgKda: 4.0 }),
      makeChampionStats({ championName: "BadKda", avgKda: 1.5 }),
    ]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("4.00")).toHaveStyle({ color: "#48D1A0" });
      expect(screen.getByText("1.50")).toHaveStyle({ color: "#E84057" });
    });
  });

  it("handles API error gracefully", async () => {
    vi.mocked(fetchChampionStats).mockRejectedValue(new Error("fail"));
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("No champion data available yet.")).toBeInTheDocument();
    });
  });

  it("fetches with default params (no count, no queueId)", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(fetchChampionStats).toHaveBeenCalledWith("test", undefined, undefined);
    });
  });

  it("re-fetches when game count filter is changed", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(fetchChampionStats).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByText("50"));
    await waitFor(() => {
      expect(fetchChampionStats).toHaveBeenCalledWith("test", 50, undefined);
    });
  });

  it("re-fetches when queue filter is changed", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(fetchChampionStats).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByText("Ranked Solo"));
    await waitFor(() => {
      expect(fetchChampionStats).toHaveBeenCalledWith("test", undefined, 420);
    });
  });

  it("renders WinLossBar in each champion card", async () => {
    vi.mocked(fetchChampionStats).mockResolvedValue([
      makeChampionStats({ championName: "Ahri", games: 10, wins: 7 }),
    ]);
    render(<ChampionsTab puuid="test" />);
    await waitFor(() => {
      expect(screen.getByText("7W")).toBeInTheDocument();
      expect(screen.getByText("3L")).toBeInTheDocument();
    });
  });
});
