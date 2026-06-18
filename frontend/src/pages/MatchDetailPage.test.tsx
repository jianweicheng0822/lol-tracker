import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MatchDetailPage from "./MatchDetailPage";
import { makeMatchDetail, makeMatchDetailParticipant } from "../test/fixtures";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ region: "NA", matchId: "NA1_123" }),
  useSearchParams: () => [new URLSearchParams("puuid=p1"), vi.fn()],
  useNavigate: () => mockNavigate,
}));

vi.mock("../api", () => ({
  fetchMatchDetail: vi.fn(),
}));

vi.mock("../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  QUEUE_NAMES: { 420: "Ranked Solo", 1700: "Arena" } as Record<number, string>,
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
  beforeEach(() => vi.clearAllMocks());

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

  it("renders ArenaScoreboard for Arena matches", async () => {
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail({ queueId: 1700 }));
    render(<MatchDetailPage />);
    await waitFor(() => {
      expect(screen.getByTestId("arena-scoreboard")).toBeInTheDocument();
    });
  });

  it("navigates home when logo is clicked", async () => {
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail());
    const user = userEvent.setup();
    render(<MatchDetailPage />);
    await user.click(screen.getByText("LoL Tracker"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("navigates back when Back button is clicked", async () => {
    vi.mocked(fetchMatchDetail).mockResolvedValue(makeMatchDetail());
    const user = userEvent.setup();
    render(<MatchDetailPage />);
    await user.click(screen.getByText("Back"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
