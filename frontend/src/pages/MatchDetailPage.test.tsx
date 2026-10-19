import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MatchDetailPage from "./MatchDetailPage";
import { makeMatchDetail, makeMatchDetailParticipant } from "../test/fixtures";

const mockNavigate = vi.fn();
let mockLocation = { key: "abc123" };
vi.mock("react-router-dom", () => ({
  useParams: () => ({ region: "NA", matchId: "NA1_123" }),
  useSearchParams: () => [new URLSearchParams("puuid=p1"), vi.fn()],
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// The header has its own tests
vi.mock("../components/AppHeader", () => ({
  default: () => <header data-testid="app-header" />,
}));

vi.mock("../api", () => ({
  fetchMatchDetail: vi.fn(),
}));

vi.mock("../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  queueLabel: (id: number) => ({ 420: "Ranked Solo", 1700: "Arena", 1750: "Arena" } as Record<number, string>)[id] ?? "Other",
  isArenaQueue: (id: number) => id === 1700 || id === 1750,
  formatDuration: (s: number) => `${Math.floor(s / 60)}m`,
  timeAgo: () => "5m ago",
}));

vi.mock("../components/ScoreboardTable", () => ({
  ScoreboardTeamTable: ({ team }: { team: { win: boolean } }) => (
    <div data-testid="team-table">{team.win ? "Win" : "Loss"}</div>
  ),
  ArenaScoreboard: () => <div data-testid="arena-scoreboard">Arena</div>,
}));

import { fetchMatchDetail } from "../api";

describe("MatchDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { key: "abc123" };
  });

  it("shows loading state initially", () => {
    vi.mocked(fetchMatchDetail).mockReturnValue(new Promise(() => {}));
    render(<MatchDetailPage />);
    expect(screen.getByText("Loading match details...")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(fetchMatchDetail).mockRejectedValue(new Error("Network error"));
    render(<MatchDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("renders Victory header for winning player", async () => {
    const match = makeMatchDetail();
    match.participants[0] = makeMatchDetailParticipant({ puuid: "p1", win: true, teamId: 100 });
    vi.mocked(fetchMatchDetail).mockResolvedValue(match);
    render(<MatchDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Victory")).toBeInTheDocument();
    });
  });

  it("renders Defeat header for losing player", async () => {
    const match = makeMatchDetail();
    match.participants[0] = makeMatchDetailParticipant({ puuid: "p1", win: false, teamId: 100 });
    vi.mocked(fetchMatchDetail).mockResolvedValue(match);
    render(<MatchDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Defeat")).toBeInTheDocument();
    });
  });

  it("renders ScoreboardTeamTable for standard matches", async () => {
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail({ queueId: 420 }));
    render(<MatchDetailPage />);
    await waitFor(() => {
      expect(screen.getAllByTestId("team-table")).toHaveLength(2);
    });
  });

  it("lists the player's own team first", async () => {
    // The player (p1, from ?puuid=) is on team 100; put team 200 first in the data
    const match = makeMatchDetail();
    match.teams = [...match.teams].reverse();
    vi.mocked(fetchMatchDetail).mockResolvedValue(match);
    render(<MatchDetailPage />);
    await waitFor(() => {
      expect(screen.getAllByTestId("team-table").map((t) => t.textContent)).toEqual(["Win", "Loss"]);
    });
  });

  it("wraps the scoreboard in its own horizontal scroll area", async () => {
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail({ queueId: 420 }));
    render(<MatchDetailPage />);
    const scroll = await screen.findByTestId("scoreboard-scroll");
    // A wide scoreboard should scroll inside this box rather than widen the page
    expect(scroll.style.overflowX).toBe("auto");
    expect(scroll).toContainElement(screen.getAllByTestId("team-table")[0]);
  });

  it("renders ArenaScoreboard for Arena matches", async () => {
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail({ queueId: 1700 }));
    render(<MatchDetailPage />);
    await waitFor(() => {
      expect(screen.getByTestId("arena-scoreboard")).toBeInTheDocument();
    });
  });

  it("navigates back when Back button is clicked", async () => {
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail());
    const user = userEvent.setup();
    render(<MatchDetailPage />);
    await user.click(screen.getByRole("button", { name: /Back/ }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("goes home from Back when the page was opened from a shared link", async () => {
    mockLocation = { key: "default" };
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail());
    const user = userEvent.setup();
    render(<MatchDetailPage />);
    await user.click(screen.getByRole("button", { name: /Back/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
