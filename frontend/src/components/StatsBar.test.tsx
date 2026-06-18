import { render, screen } from "@testing-library/react";
import StatsBar from "./StatsBar";
import { makePlayerStats, makeMatchSummary } from "../test/fixtures";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

vi.mock("../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  championIconUrl: (name: string) => `${name}.png`,
  hideOnError: vi.fn(),
}));

describe("StatsBar", () => {
  it("returns null when totalGames is 0", () => {
    const { container } = render(
      <StatsBar stats={makePlayerStats({ totalGames: 0 })} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders win rate and record", () => {
    render(<StatsBar stats={makePlayerStats({ winRate: 60, wins: 12, losses: 8, totalGames: 20 })} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText(/12W 8L/)).toBeInTheDocument();
  });

  it("renders KDA ratio", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 3.76 })} />);
    expect(screen.getByText("3.76 : 1")).toBeInTheDocument();
  });

  it("color-codes KDA (green for >=3)", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 3.5 })} />);
    expect(screen.getByText("3.50 : 1")).toHaveStyle({ color: "#3a9e72" });
  });

  it("color-codes KDA (yellow for >=2 and <3)", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 2.5 })} />);
    expect(screen.getByText("2.50 : 1")).toHaveStyle({ color: "#c9981a" });
  });

  it("color-codes KDA (red for <2)", () => {
    render(<StatsBar stats={makePlayerStats({ averageKda: 1.5 })} />);
    expect(screen.getByText("1.50 : 1")).toHaveStyle({ color: "#b05050" });
  });

  it("renders kill participation", () => {
    render(
      <StatsBar stats={makePlayerStats({ averageKills: 7.5, averageDeaths: 4.2, averageAssists: 8.3 })} />,
    );
    expect(screen.getByText(/P\/Kill/)).toBeInTheDocument();
  });

  it("renders top 3 recent champions when matches are provided", () => {
    const matches = [
      makeMatchSummary({ championName: "Ahri" }),
      makeMatchSummary({ championName: "Ahri" }),
      makeMatchSummary({ championName: "Zed" }),
      makeMatchSummary({ championName: "Jinx" }),
    ];
    render(<StatsBar stats={makePlayerStats()} matches={matches} />);
    expect(screen.getByText("Ahri")).toBeInTheDocument();
    expect(screen.getByText("Zed")).toBeInTheDocument();
    expect(screen.getByText("Jinx")).toBeInTheDocument();
  });

  it("does not render champion section when no matches", () => {
    render(<StatsBar stats={makePlayerStats()} />);
    expect(screen.queryByText("Recent Champions")).not.toBeInTheDocument();
  });
});
