import { render, screen } from "@testing-library/react";
import StatsBar from "./StatsBar";
import { makePlayerStats, makeMatchSummary } from "../test/fixtures";

vi.mock("../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  championIconUrl: (name: string) => `${name}.png`,
  hideOnError: vi.fn(),
}));

describe("StatsBar", () => {
  it("returns null when totalGames is 0", () => {
    const { container } = render(
      <StatsBar stats={makePlayerStats({ totalGames: 0 })} matches={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders win rate and record", () => {
    render(<StatsBar stats={makePlayerStats({ winRate: 60, wins: 12, losses: 8, totalGames: 20 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText(/12W 8L/)).toBeInTheDocument();
  });

  it("renders KDA ratio", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 3.76 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("3.76")).toBeInTheDocument();
  });

  it("color-codes KDA (green for >=3)", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 3.5 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("3.50")).toHaveStyle({ color: "#3a9e72" });
  });

  it("color-codes KDA (yellow for >=2 and <3)", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 2.5 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("2.50")).toHaveStyle({ color: "#c9981a" });
  });

  it("color-codes KDA (red for <2)", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 1.5 })} matches={[makeMatchSummary()]} />);
    expect(screen.getByText("1.50")).toHaveStyle({ color: "#b05050" });
  });

  it("shows streak when consecutive wins", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
    ];
    render(<StatsBar stats={makePlayerStats()} matches={matches} />);
    expect(screen.getByText(/3W/)).toBeInTheDocument();
    expect(screen.getByText("Streak")).toBeInTheDocument();
  });

  it("shows no streak indicator when alternating results", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
    ];
    render(<StatsBar stats={makePlayerStats()} matches={matches} />);
    expect(screen.getByText("No streak")).toBeInTheDocument();
  });

  it("renders main champion with icon", () => {
    const matches = [
      makeMatchSummary({ championName: "Ahri" }),
      makeMatchSummary({ championName: "Ahri" }),
      makeMatchSummary({ championName: "Zed" }),
    ];
    render(<StatsBar stats={makePlayerStats()} matches={matches} />);
    expect(screen.getByText("Ahri")).toBeInTheDocument();
  });

  it("renders recent form dots", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
      makeMatchSummary({ win: true }),
    ];
    render(<StatsBar stats={makePlayerStats()} matches={matches} />);
    expect(screen.getByText(/Last 5/)).toBeInTheDocument();
  });
});
