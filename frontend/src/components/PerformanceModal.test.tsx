import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PerformanceModal from "./PerformanceModal";
import { makeMatchTrendPoint, makeLpSnapshot } from "../test/fixtures";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
}));

vi.mock("../api", () => ({
  fetchMatchTrends: vi.fn(),
  fetchLpHistory: vi.fn(),
}));

vi.mock("../utils/lp", () => ({
  toAbsoluteLp: (_tier: string, _rank: string, lp: number) => lp,
}));

vi.mock("../utils/trends", () => ({
  movingAverage: (vals: number[]) => vals,
  rollingWinRate: (wins: boolean[]) => wins.map((_, i) => (i + 1) * 10),
}));

import { fetchMatchTrends, fetchLpHistory } from "../api";

describe("PerformanceModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading state", () => {
    vi.mocked(fetchMatchTrends).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchLpHistory).mockReturnValue(new Promise(() => {}));
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    expect(screen.getByText("Loading performance data...")).toBeInTheDocument();
  });

  it("shows empty state when no data", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([]);
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/No trend data available/)).toBeInTheDocument();
    });
  });

  it("renders 4 tab pills", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([makeMatchTrendPoint()]);
    vi.mocked(fetchLpHistory).mockResolvedValue([makeLpSnapshot()]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("LP")).toBeInTheDocument();
      expect(screen.getByText("Win Rate")).toBeInTheDocument();
      expect(screen.getByText("KDA")).toBeInTheDocument();
      expect(screen.getByText("Damage")).toBeInTheDocument();
    });
  });

  it("closes on Escape key", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([]);
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const onClose = vi.fn();
    render(<PerformanceModal puuid="test" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when overlay is clicked", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([]);
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const onClose = vi.fn();
    const { container } = render(<PerformanceModal puuid="test" onClose={onClose} />);
    await waitFor(() => screen.getByText("Performance Trends"));
    // The overlay is the outermost div (position: fixed)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when modal body is clicked (stopPropagation)", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([]);
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PerformanceModal puuid="test" onClose={onClose} />);
    await waitFor(() => screen.getByText("Performance Trends"));
    await user.click(screen.getByText("Performance Trends"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when close button is clicked", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([]);
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PerformanceModal puuid="test" onClose={onClose} />);
    await waitFor(() => screen.getByText("×"));
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("switches between chart tabs", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([makeMatchTrendPoint(), makeMatchTrendPoint()]);
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40 }),
      makeLpSnapshot({ leaguePoints: 60 }),
    ]);
    const user = userEvent.setup();
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("KDA"));

    await user.click(screen.getByText("KDA"));
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();

    await user.click(screen.getByText("Win Rate"));
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();

    await user.click(screen.getByText("Damage"));
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
  });

  it("shows 'Not enough LP data' when fewer than 2 LP snapshots", async () => {
    vi.mocked(fetchMatchTrends).mockResolvedValue([makeMatchTrendPoint()]);
    vi.mocked(fetchLpHistory).mockResolvedValue([makeLpSnapshot()]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Not enough LP data for chart")).toBeInTheDocument();
    });
  });
});
