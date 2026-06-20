import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PerformanceModal from "./PerformanceModal";
import { makeLpSnapshot } from "../test/fixtures";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock("../api", () => ({
  fetchLpHistory: vi.fn(),
}));

vi.mock("../utils/lp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/lp")>();
  return {
    ...actual,
    toAbsoluteLp: (_tier: string, _rank: string, lp: number) => lp,
  };
});

import { fetchLpHistory } from "../api";

describe("PerformanceModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading state", () => {
    vi.mocked(fetchLpHistory).mockReturnValue(new Promise(() => {}));
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    expect(screen.getByText("Loading LP data...")).toBeInTheDocument();
  });

  it("shows empty state when no data", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/No LP data for/)).toBeInTheDocument();
    });
  });

  it("renders queue filter pills", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([makeLpSnapshot()]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Solo/Duo")).toBeInTheDocument();
      expect(screen.getByText("Flex")).toBeInTheDocument();
    });
  });

  it("switches queue filter", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("Flex"));

    await user.click(screen.getByText("Flex"));
    expect(fetchLpHistory).toHaveBeenCalledWith("test", "RANKED_FLEX_SR");
  });

  it("closes on Escape key", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const onClose = vi.fn();
    render(<PerformanceModal puuid="test" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when overlay is clicked", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const onClose = vi.fn();
    const { container } = render(<PerformanceModal puuid="test" onClose={onClose} />);
    await waitFor(() => screen.getByText("LP History"));
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when modal body is clicked (stopPropagation)", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PerformanceModal puuid="test" onClose={onClose} />);
    await waitFor(() => screen.getByText("LP History"));
    await user.click(screen.getByText("LP History"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when close button is clicked", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PerformanceModal puuid="test" onClose={onClose} />);
    await waitFor(() => screen.getByText("×"));
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows 'Not enough LP data' when fewer than 2 LP snapshots", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([makeLpSnapshot()]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Not enough LP data for chart")).toBeInTheDocument();
    });
  });

  it("renders chart when 2+ LP snapshots exist", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40 }),
      makeLpSnapshot({ leaguePoints: 60 }),
    ]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    });
  });
});
