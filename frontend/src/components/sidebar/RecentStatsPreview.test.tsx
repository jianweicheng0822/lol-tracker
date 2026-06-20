import { render, screen } from "@testing-library/react";
import RecentStatsPreview from "./RecentStatsPreview";
import { makePlayerStats, makeMatchSummary } from "../../test/fixtures";

describe("RecentStatsPreview", () => {
  it("returns null when totalGames is 0", () => {
    const { container } = render(
      <RecentStatsPreview stats={makePlayerStats({ totalGames: 0 })} matches={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders win rate and KDA", () => {
    render(<RecentStatsPreview stats={makePlayerStats()} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("3.76")).toBeInTheDocument();
  });

  it("renders title with game count", () => {
    render(<RecentStatsPreview stats={makePlayerStats()} matches={[makeMatchSummary()]} />);
    expect(screen.getByText(/Recent 20 Ranked Games/)).toBeInTheDocument();
  });

  it("renders main role from match positions", () => {
    const matches = [
      makeMatchSummary({ individualPosition: "BOTTOM" }),
      makeMatchSummary({ individualPosition: "BOTTOM" }),
      makeMatchSummary({ individualPosition: "UTILITY" }),
    ];
    render(<RecentStatsPreview stats={makePlayerStats()} matches={matches} />);
    expect(screen.getByText("Bot")).toBeInTheDocument();
    expect(screen.getByText("Main Role")).toBeInTheDocument();
  });

  it("shows Support label for UTILITY position", () => {
    const matches = [makeMatchSummary({ individualPosition: "UTILITY" })];
    render(<RecentStatsPreview stats={makePlayerStats()} matches={matches} />);
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("uses blue color for win rate >= 60", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 65 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("65%")).toHaveStyle({ color: "#3A8FD6" });
  });

  it("uses green color for win rate between 50 and 59", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 55 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("55%")).toHaveStyle({ color: "#48D1A0" });
  });

  it("uses red color for win rate below 50", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 40 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("40%")).toHaveStyle({ color: "#E84057" });
  });
});
