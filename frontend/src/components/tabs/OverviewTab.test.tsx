import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewTab from "./OverviewTab";
import { makePlayerStats, makeMatchSummary, makeRankedEntry } from "../../test/fixtures";

vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("../sidebar/OverviewSidebar", () => ({
  default: () => <div data-testid="overview-sidebar">Sidebar</div>,
}));

vi.mock("../MatchList", () => ({
  default: ({ onShowUpgrade }: { onShowUpgrade?: () => void }) => (
    <div data-testid="match-list">
      {onShowUpgrade && <button data-testid="show-upgrade" onClick={onShowUpgrade}>Upgrade</button>}
    </div>
  ),
}));

vi.mock("../sidebar/LpSparkline", () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="lp-sparkline-mobile" onClick={onClick}>LpSparkline</div>
  ),
}));

vi.mock("../PerformanceModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="performance-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("../UpgradeModal", () => ({
  default: ({ onClose, onShowAuth }: { onClose: () => void; onShowAuth: () => void }) => (
    <div data-testid="upgrade-modal">
      <button data-testid="close-upgrade" onClick={onClose}>CloseUpgrade</button>
      <button data-testid="show-auth" onClick={onShowAuth}>ShowAuth</button>
    </div>
  ),
}));

vi.mock("../../api", () => ({
  getAuthToken: vi.fn(() => null),
  upgradeTier: vi.fn(() => Promise.resolve({ tier: 1 })),
}));

import { useIsMobile } from "../../hooks/useIsMobile";

describe("OverviewTab", () => {
  const defaultProps = {
    stats: makePlayerStats(),
    matches: [makeMatchSummary()],
    ranked: [makeRankedEntry()],
    region: "NA",
    puuid: "test-puuid",
    onLoadMore: vi.fn(),
    isLoadingMore: false,
    hasMore: true,
    tier: 1,
    onTabChange: vi.fn(),
    onShowAuth: vi.fn(),
    onTierChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    sessionStorage.clear();
  });

  it("renders sidebar and match list", () => {
    render(<OverviewTab {...defaultProps} />);
    expect(screen.getByTestId("overview-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("match-list")).toBeInTheDocument();
  });

  it("does not show upgrade banner when tier > 0", () => {
    render(<OverviewTab {...defaultProps} tier={1} />);
    expect(screen.queryByText(/FREE tier/)).not.toBeInTheDocument();
  });

  it("shows upgrade banner when tier is 0", () => {
    render(<OverviewTab {...defaultProps} tier={0} />);
    expect(screen.getByText(/Unlock AI match coaching/)).toBeInTheDocument();
  });

  it("shows 'See Plans' button when tier 0", () => {
    render(<OverviewTab {...defaultProps} tier={0} />);
    expect(screen.getByText("See Plans")).toBeInTheDocument();
  });

  it("does not show PerformanceModal initially", () => {
    render(<OverviewTab {...defaultProps} />);
    expect(screen.queryByTestId("performance-modal")).not.toBeInTheDocument();
  });

  it("uses grid layout on desktop and stack layout on mobile", () => {
    const { container, rerender } = render(<OverviewTab {...defaultProps} />);
    expect((container.firstChild as HTMLElement).style.display).toBe("grid");

    vi.mocked(useIsMobile).mockReturnValue(true);
    rerender(<OverviewTab {...defaultProps} />);
    expect((container.firstChild as HTMLElement).style.display).toBe("flex");
  });

  it("does not show LP sparkline on desktop", () => {
    render(<OverviewTab {...defaultProps} />);
    expect(screen.queryByTestId("lp-sparkline-mobile")).not.toBeInTheDocument();
  });

  it("shows LP sparkline on mobile", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<OverviewTab {...defaultProps} />);
    expect(screen.getByTestId("lp-sparkline-mobile")).toBeInTheDocument();
  });

  it("dismisses upgrade banner when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<OverviewTab {...defaultProps} tier={0} />);
    expect(screen.getByText(/Unlock AI match coaching/)).toBeInTheDocument();
    await user.click(screen.getByText("\u00d7"));
    expect(screen.queryByText(/Unlock AI match coaching/)).not.toBeInTheDocument();
  });

  it("opens upgrade modal when See Plans is clicked", async () => {
    const user = userEvent.setup();
    render(<OverviewTab {...defaultProps} tier={0} />);
    await user.click(screen.getByText("See Plans"));
    expect(screen.getByTestId("upgrade-modal")).toBeInTheDocument();
  });

  it("closes upgrade modal", async () => {
    const user = userEvent.setup();
    render(<OverviewTab {...defaultProps} tier={0} />);
    await user.click(screen.getByText("See Plans"));
    expect(screen.getByTestId("upgrade-modal")).toBeInTheDocument();
    await user.click(screen.getByTestId("close-upgrade"));
    expect(screen.queryByTestId("upgrade-modal")).not.toBeInTheDocument();
  });

  it("opens upgrade modal from MatchList callback", async () => {
    const user = userEvent.setup();
    render(<OverviewTab {...defaultProps} />);
    await user.click(screen.getByTestId("show-upgrade"));
    expect(screen.getByTestId("upgrade-modal")).toBeInTheDocument();
  });

  it("calls onShowAuth when upgrade modal triggers auth", async () => {
    const user = userEvent.setup();
    render(<OverviewTab {...defaultProps} tier={0} />);
    await user.click(screen.getByText("See Plans"));
    await user.click(screen.getByTestId("show-auth"));
    expect(defaultProps.onShowAuth).toHaveBeenCalled();
    // Upgrade modal should be closed
    expect(screen.queryByTestId("upgrade-modal")).not.toBeInTheDocument();
  });

  it("opens performance modal from LP sparkline on mobile", async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const user = userEvent.setup();
    render(<OverviewTab {...defaultProps} />);
    await user.click(screen.getByTestId("lp-sparkline-mobile"));
    expect(screen.getByTestId("performance-modal")).toBeInTheDocument();
  });

  it("closes performance modal", async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    const user = userEvent.setup();
    render(<OverviewTab {...defaultProps} />);
    await user.click(screen.getByTestId("lp-sparkline-mobile"));
    expect(screen.getByTestId("performance-modal")).toBeInTheDocument();
    await user.click(screen.getByText("Close"));
    expect(screen.queryByTestId("performance-modal")).not.toBeInTheDocument();
  });
});
