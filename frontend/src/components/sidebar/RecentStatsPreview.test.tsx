import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecentStatsPreview from "./RecentStatsPreview";
import { makePlayerStats, makeMatchSummary } from "../../test/fixtures";

describe("RecentStatsPreview", () => {
  it("returns null when totalGames is 0", () => {
    const { container } = render(
      <RecentStatsPreview stats={makePlayerStats({ totalGames: 0 })} matches={[]} onClick={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders win rate and KDA", () => {
    render(<RecentStatsPreview stats={makePlayerStats()} matches={[makeMatchSummary()]} onClick={vi.fn()} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("3.76")).toBeInTheDocument();
  });

  it("renders title as Recent 10 Games", () => {
    render(<RecentStatsPreview stats={makePlayerStats()} matches={[makeMatchSummary()]} onClick={vi.fn()} />);
    expect(screen.getByText("Recent 10 Games")).toBeInTheDocument();
  });

  it("renders main role from match positions", () => {
    const matches = [
      makeMatchSummary({ individualPosition: "BOTTOM" }),
      makeMatchSummary({ individualPosition: "BOTTOM" }),
      makeMatchSummary({ individualPosition: "UTILITY" }),
    ];
    render(<RecentStatsPreview stats={makePlayerStats()} matches={matches} onClick={vi.fn()} />);
    expect(screen.getByText("Bot")).toBeInTheDocument();
    expect(screen.getByText("Main Role")).toBeInTheDocument();
  });

  it("shows Support label for UTILITY position", () => {
    const matches = [makeMatchSummary({ individualPosition: "UTILITY" })];
    render(<RecentStatsPreview stats={makePlayerStats()} matches={matches} onClick={vi.fn()} />);
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("uses gold color for win rate >= 60", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 65 })} matches={[makeMatchSummary()]} onClick={vi.fn()} />);
    expect(screen.getByText("65%")).toHaveStyle({ color: "#D4A017" });
  });

  it("uses neutral color for win rate between 50 and 59", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 55 })} matches={[makeMatchSummary()]} onClick={vi.fn()} />);
    expect(screen.getByText("55%")).toHaveStyle({ color: "#7A7060" });
  });

  it("uses red color for win rate below 50", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 40 })} matches={[makeMatchSummary()]} onClick={vi.fn()} />);
    expect(screen.getByText("40%")).toHaveStyle({ color: "#C44040" });
  });

  it("calls onClick when card is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<RecentStatsPreview stats={makePlayerStats()} matches={[makeMatchSummary()]} onClick={handler} />);
    await user.click(screen.getByText("Recent 10 Games"));
    expect(handler).toHaveBeenCalledOnce();
  });
});
