import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PerformanceModal from "./PerformanceModal";
import { makeLpSnapshot } from "../test/fixtures";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Area: () => null,
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
      expect(screen.getByText("No Solo/Duo LP recorded yet.")).toBeInTheDocument();
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
    await waitFor(() => screen.getByText("Ranked Progression"));
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when modal body is clicked (stopPropagation)", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([]);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PerformanceModal puuid="test" onClose={onClose} />);
    await waitFor(() => screen.getByText("Ranked Progression"));
    await user.click(screen.getByText("Ranked Progression"));
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

  it("explains that tracking just started when there's a single snapshot", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([makeLpSnapshot({ tier: "MASTER", rankDivision: "I", leaguePoints: 1359 })]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    expect(await screen.findByText(/Tracking started .*A line appears once their LP changes/)).toBeInTheDocument();
    // The current rank still shows, without the change/peak that need two points
    expect(screen.getByText("Master")).toBeInTheDocument();
    expect(screen.getByText("1,359 LP")).toBeInTheDocument();
    expect(screen.queryByText("Peak")).not.toBeInTheDocument();
  });

  it("summarizes current rank, LP change and peak, and says when tracking started", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40, capturedAt: Date.now() - 50 * 86400000 }),
      makeLpSnapshot({ leaguePoints: 90, capturedAt: Date.now() - 10 * 86400000 }),
      makeLpSnapshot({ leaguePoints: 60, capturedAt: Date.now() - 5 * 86400000 }),
    ]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    expect(await screen.findByText("Gold II")).toBeInTheDocument();
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("-30 LP")).toBeInTheDocument();
    expect(screen.getByText("Gold II 90 LP")).toBeInTheDocument();
    expect(screen.getByText(/Tracking since/)).toBeInTheDocument();
  });

  it("labels the change by tracking start when tracking is newer than the range", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40, capturedAt: Date.now() - 3 * 86400000 }),
      makeLpSnapshot({ leaguePoints: 75, capturedAt: Date.now() - 1 * 86400000 }),
    ]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    expect(await screen.findByText(/^Since /)).toBeInTheDocument();
    expect(screen.getByText("+35 LP")).toBeInTheDocument();
  });

  it("only offers time ranges that add data", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40, capturedAt: Date.now() - 50 * 86400000 }),
      makeLpSnapshot({ leaguePoints: 90, capturedAt: Date.now() - 10 * 86400000 }),
      makeLpSnapshot({ leaguePoints: 60, capturedAt: Date.now() - 5 * 86400000 }),
    ]);
    render(<PerformanceModal puuid="test" onClose={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "30D" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60D" })).toBeInTheDocument();
    // Nothing older than 60 days, so 90D and 180D would show the same chart
    expect(screen.queryByRole("button", { name: "90D" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "180D" })).not.toBeInTheDocument();
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
