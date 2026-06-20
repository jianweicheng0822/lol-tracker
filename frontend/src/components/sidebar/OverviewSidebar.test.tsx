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
  default: () => (
    <div data-testid="recent-stats">RecentStatsPreview</div>
  ),
}));

vi.mock("./TopChampionsPreview", () => ({
  default: ({ onViewAll }: { onViewAll: () => void }) => (
    <div data-testid="top-champs" onClick={onViewAll}>TopChampionsPreview</div>
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
