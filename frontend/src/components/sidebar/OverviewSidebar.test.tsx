import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewSidebar from "./OverviewSidebar";
import { makePlayerStats, makeMatchSummary, makeRankedEntry } from "../../test/fixtures";

vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("./LpSparkline", () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="lp-sparkline" onClick={onClick}>LpSparkline</div>
  ),
}));

vi.mock("./RecentStatsPreview", () => ({
  default: ({ matches }: { matches: unknown[] }) => (
    <div data-testid="recent-stats" data-count={matches.length}>RecentStatsPreview</div>
  ),
}));

vi.mock("./TopChampionsPreview", () => ({
  default: ({ matches, onViewAll, scopeLabel }: { matches: unknown[]; onViewAll: () => void; scopeLabel?: string }) => (
    <div data-testid="top-champs" data-count={matches.length} onClick={onViewAll}>
      TopChampionsPreview {scopeLabel}
    </div>
  ),
}));

import { useIsMobile } from "../../hooks/useIsMobile";

describe("OverviewSidebar", () => {
  const defaultProps = {
    stats: makePlayerStats(),
    matches: [makeMatchSummary()],
    ranked: [makeRankedEntry()],
    puuid: "test-puuid",
    onOpenPerformance: vi.fn(),
    onViewChampions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it("uses only ranked games among the 20 most recent for stats and top champions", () => {
    const matches = [
      makeMatchSummary({ queueId: 1750 }), // Arena — excluded
      makeMatchSummary({ queueId: 420 }),
      makeMatchSummary({ queueId: 450 }),  // ARAM — excluded
      makeMatchSummary({ queueId: 440 }),
      ...Array.from({ length: 16 }, () => makeMatchSummary({ queueId: 420 })),
      // Loaded via "Load more" — beyond the 20 the backend stats cover
      ...Array.from({ length: 5 }, () => makeMatchSummary({ queueId: 420 })),
    ];
    render(<OverviewSidebar {...defaultProps} matches={matches} />);

    expect(screen.getByTestId("top-champs")).toHaveAttribute("data-count", "18");
    expect(screen.getByTestId("recent-stats")).toHaveAttribute("data-count", "18");
    expect(screen.getByTestId("top-champs")).toHaveTextContent("Last 18 ranked games");
  });

  it("renders all sections on desktop", () => {
    render(<OverviewSidebar {...defaultProps} />);
    expect(screen.getByTestId("lp-sparkline")).toBeInTheDocument();
    expect(screen.getByTestId("recent-stats")).toBeInTheDocument();
    expect(screen.getByTestId("top-champs")).toBeInTheDocument();
  });

  it("hides LpSparkline on mobile", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<OverviewSidebar {...defaultProps} />);
    expect(screen.queryByTestId("lp-sparkline")).not.toBeInTheDocument();
  });

  it("shows accordion buttons on mobile", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<OverviewSidebar {...defaultProps} />);
    expect(screen.getByText("Recent 20 Ranked Games")).toBeInTheDocument();
    expect(screen.getByText("Top Champions")).toBeInTheDocument();
  });

  it("toggles accordion content on mobile", async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const user = userEvent.setup();
    render(<OverviewSidebar {...defaultProps} />);

    const recentBtn = screen.getByText("Recent 20 Ranked Games");
    await user.click(recentBtn);
    expect(screen.getByTestId("recent-stats")).toBeInTheDocument();
  });

  it("applies sticky positioning on desktop", () => {
    const { container } = render(<OverviewSidebar {...defaultProps} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.position).toBe("sticky");
  });

  it("does not apply sticky positioning on mobile", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const { container } = render(<OverviewSidebar {...defaultProps} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.position).not.toBe("sticky");
  });

  it("shows LP sparkline on desktop", () => {
    render(<OverviewSidebar {...defaultProps} />);
    expect(screen.getByTestId("lp-sparkline")).toBeInTheDocument();
  });
});
