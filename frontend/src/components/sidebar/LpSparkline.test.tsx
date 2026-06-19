import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LpSparkline from "./LpSparkline";
import { makeLpSnapshot } from "../../test/fixtures";

vi.mock("../../api", () => ({
  fetchLpHistory: vi.fn(),
}));

vi.mock("../../utils/lp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/lp")>();
  return {
    ...actual,
    toAbsoluteLp: (_tier: string, _rank: string, lp: number) => lp,
  };
});

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

  it("renders LP History title and chart with 2+ data points", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40, capturedAt: Date.now() - 86400000 }),
      makeLpSnapshot({ leaguePoints: 60, capturedAt: Date.now() }),
    ]);
    render(<LpSparkline puuid="test" onClick={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("LP History")).toBeInTheDocument();
      expect(screen.getByText("60 LP")).toBeInTheDocument();
    });
  });

  it("shows tier and rank info for latest point", async () => {
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ tier: "GOLD", rankDivision: "II", leaguePoints: 40 }),
      makeLpSnapshot({ tier: "GOLD", rankDivision: "II", leaguePoints: 60 }),
    ]);
    render(<LpSparkline puuid="test" onClick={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Gold II")).toBeInTheDocument();
    });
  });

  it("calls onClick when View Full History is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    vi.mocked(fetchLpHistory).mockResolvedValue([
      makeLpSnapshot({ leaguePoints: 40 }),
      makeLpSnapshot({ leaguePoints: 60 }),
    ]);
    render(<LpSparkline puuid="test" onClick={handler} />);
    await waitFor(() => screen.getByText("LP History"));
    await user.click(screen.getByText(/View Full History/));
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
