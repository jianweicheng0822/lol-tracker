import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LpSparkline from "./LpSparkline";
import { makeLpSnapshot } from "../../test/fixtures";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
}));

vi.mock("../../api", () => ({
  fetchLpHistory: vi.fn(),
}));

vi.mock("../../utils/lp", () => ({
  toAbsoluteLp: (_tier: string, _rank: string, lp: number) => lp,
}));

import { fetchLpHistory } from "../../api";

describe("LpSparkline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null while loading", () => {
    vi.mocked(fetchLpHistory).mockReturnValue(new Promise(() => {}));
    const { container } = render(<LpSparkline puuid="test" onClick={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows 'No LP data' when fewer than 2 data points", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([makeLpSnapshot()]);
    render(<LpSparkline puuid="test" onClick={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("No LP data")).toBeInTheDocument();
    });
  });

  it("renders chart when 2+ data points exist", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40 }),
      makeLpSnapshot({ leaguePoints: 60 }),
    ]);
    render(<LpSparkline puuid="test" onClick={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    });
  });

  it("calls onClick when chart card is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40 }),
      makeLpSnapshot({ leaguePoints: 60 }),
    ]);
    render(<LpSparkline puuid="test" onClick={handler} />);
    await waitFor(() => screen.getByText("LP Trend"));
    await user.click(screen.getByText("LP Trend"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("handles API error gracefully", async () => {
    vi.mocked(fetchLpHistory).mockRejectedValue(new Error("fail"));
    render(<LpSparkline puuid="test" onClick={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("No LP data")).toBeInTheDocument();
    });
  });
});
