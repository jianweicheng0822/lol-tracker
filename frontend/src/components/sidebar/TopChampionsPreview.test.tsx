import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TopChampionsPreview from "./TopChampionsPreview";
import { makeMatchSummary } from "../../test/fixtures";

vi.mock("../../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  championIconUrl: (name: string) => `${name}.png`,
  hideOnError: vi.fn(),
}));

describe("TopChampionsPreview", () => {
  it("returns null when no matches", () => {
    const { container } = render(
      <TopChampionsPreview matches={[]} onViewAll={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("aggregates and shows top 5 champions sorted by games", () => {
    const matches = [
      makeMatchSummary({ championName: "Ahri" }),
      makeMatchSummary({ championName: "Ahri" }),
      makeMatchSummary({ championName: "Ahri" }),
      makeMatchSummary({ championName: "Zed" }),
      makeMatchSummary({ championName: "Zed" }),
      makeMatchSummary({ championName: "Jinx" }),
    ];
    render(<TopChampionsPreview matches={matches} onViewAll={vi.fn()} />);
    expect(screen.getByText("Ahri")).toBeInTheDocument();
    expect(screen.getByText("Zed")).toBeInTheDocument();
    expect(screen.getByText("Jinx")).toBeInTheDocument();
  });

  it("limits to 5 champions", () => {
    const names = ["A", "B", "C", "D", "E", "F"];
    const matches = names.map((n) => makeMatchSummary({ championName: n }));
    render(<TopChampionsPreview matches={matches} onViewAll={vi.fn()} />);
    expect(screen.queryByText("F")).not.toBeInTheDocument();
  });

  it("calls onViewAll when 'View all' is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <TopChampionsPreview matches={[makeMatchSummary()]} onViewAll={handler} />,
    );
    await user.click(screen.getByText(/View all/));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("displays win/loss bar per champion", () => {
    const matches = [
      makeMatchSummary({ championName: "Ahri", win: true }),
      makeMatchSummary({ championName: "Ahri", win: false }),
    ];
    render(<TopChampionsPreview matches={matches} onViewAll={vi.fn()} />);
    expect(screen.getByText("1W")).toBeInTheDocument();
    expect(screen.getByText("1L")).toBeInTheDocument();
  });
});
