import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecentStatsPreview from "./RecentStatsPreview";
import { makePlayerStats } from "../../test/fixtures";

describe("RecentStatsPreview", () => {
  it("returns null when totalGames is 0", () => {
    const { container } = render(
      <RecentStatsPreview stats={makePlayerStats({ totalGames: 0 })} onClick={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders win rate, KDA, and games", () => {
    render(<RecentStatsPreview stats={makePlayerStats()} onClick={vi.fn()} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("3.76")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("uses green color for win rate >= 60", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 65 })} onClick={vi.fn()} />);
    expect(screen.getByText("65%")).toHaveStyle({ color: "#34d399" });
  });

  it("uses neutral color for win rate between 50 and 59", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 55 })} onClick={vi.fn()} />);
    expect(screen.getByText("55%")).toHaveStyle({ color: "#8b949e" });
  });

  it("uses red color for win rate below 50", () => {
    render(<RecentStatsPreview stats={makePlayerStats({ winRate: 40 })} onClick={vi.fn()} />);
    expect(screen.getByText("40%")).toHaveStyle({ color: "#f87171" });
  });

  it("calls onClick when card is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<RecentStatsPreview stats={makePlayerStats()} onClick={handler} />);
    await user.click(screen.getByText("Recent Stats"));
    expect(handler).toHaveBeenCalledOnce();
  });
});
