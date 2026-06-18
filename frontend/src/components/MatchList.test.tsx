import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MatchList from "./MatchList";
import { makeMatchSummary } from "../test/fixtures";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api", () => ({
  fetchMatchDetail: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  championIconUrl: (name: string) => `${name}.png`,
  itemIconUrl: (id: number) => `item_${id}.png`,
  spellIconUrl: (id: number) => `spell_${id}.png`,
  keystoneIconUrl: (id: number) => `keystone_${id}.png`,
  runeStyleIconUrl: (id: number) => `runestyle_${id}.png`,
  hideOnError: vi.fn(),
  formatDuration: (s: number) => `${Math.floor(s / 60)}m`,
  timeAgo: () => "5m ago",
  QUEUE_NAMES: { 420: "Ranked Solo", 440: "Ranked Flex", 450: "ARAM", 1700: "Arena" } as Record<number, string>,
}));

vi.mock("./ScoreboardTable", () => ({
  ScoreboardTeamTable: () => <div data-testid="team-table">TeamTable</div>,
  ArenaScoreboard: () => <div data-testid="arena-scoreboard">Arena</div>,
}));

vi.mock("./AiChatModal", () => ({
  default: () => <div data-testid="ai-chat-modal">AiChat</div>,
}));

describe("MatchList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when matches is empty", () => {
    const { container } = render(<MatchList matches={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders match cards with KDA", () => {
    const match = makeMatchSummary({ kills: 10, deaths: 2, assists: 5 });
    render(<MatchList matches={[match]} region="NA" puuid="test" />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows Victory for wins and Defeat for losses", () => {
    const matches = [
      makeMatchSummary({ matchId: "m1", win: true }),
      makeMatchSummary({ matchId: "m2", win: false }),
    ];
    render(<MatchList matches={matches} region="NA" puuid="test" />);
    expect(screen.getByText("Victory")).toBeInTheDocument();
    expect(screen.getByText("Defeat")).toBeInTheDocument();
  });

  it("shows queue name and game duration", () => {
    render(
      <MatchList matches={[makeMatchSummary({ queueId: 420, gameDurationSec: 1800 })]} region="NA" puuid="test" />,
    );
    expect(screen.getByText("Ranked Solo")).toBeInTheDocument();
    expect(screen.getByText("30m")).toBeInTheDocument();
  });

  it("shows performance tags for strong KDA", () => {
    const match = makeMatchSummary({
      kills: 15, deaths: 1, assists: 10, teamTotalKills: 30,
    });
    render(<MatchList matches={[match]} region="NA" puuid="test" />);
    expect(screen.getByText("MVP")).toBeInTheDocument();
  });

  it("shows Load More button when hasMore is true", () => {
    render(
      <MatchList
        matches={[makeMatchSummary()]}
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoadingMore={false}
      />,
    );
    expect(screen.getByText("Load More")).toBeInTheDocument();
  });

  it("shows Loading... when isLoadingMore is true", () => {
    render(
      <MatchList
        matches={[makeMatchSummary()]}
        onLoadMore={vi.fn()}
        hasMore={true}
        isLoadingMore={true}
      />,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("hides Load More button when hasMore is false", () => {
    render(
      <MatchList
        matches={[makeMatchSummary()]}
        onLoadMore={vi.fn()}
        hasMore={false}
      />,
    );
    expect(screen.queryByText("Load More")).not.toBeInTheDocument();
  });

  it("calls onLoadMore when Load More is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <MatchList
        matches={[makeMatchSummary()]}
        onLoadMore={handler}
        hasMore={true}
        isLoadingMore={false}
      />,
    );
    await user.click(screen.getByText("Load More"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("shows AI button only for tier 1", () => {
    render(
      <MatchList
        matches={[makeMatchSummary()]}
        region="NA"
        puuid="test"
        tier={1}
      />,
    );
    expect(screen.getByTitle("Analyze with AI")).toBeInTheDocument();
  });

  it("hides AI button for tier 0", () => {
    render(
      <MatchList
        matches={[makeMatchSummary()]}
        region="NA"
        puuid="test"
        tier={0}
      />,
    );
    expect(screen.queryByTitle("Analyze with AI")).not.toBeInTheDocument();
  });

  it("treats Arena placement 1-4 as win", () => {
    const match = makeMatchSummary({
      queueId: 1700,
      win: false,
      placement: 2,
      augments: [1, 2, 3, 4],
    });
    render(<MatchList matches={[match]} region="NA" puuid="test" />);
    expect(screen.getByText("Victory")).toBeInTheDocument();
  });

  it("treats Arena placement 5-8 as loss", () => {
    const match = makeMatchSummary({
      queueId: 1700,
      win: true,
      placement: 6,
      augments: [1, 2, 3, 4],
    });
    render(<MatchList matches={[match]} region="NA" puuid="test" />);
    expect(screen.getByText("Defeat")).toBeInTheDocument();
  });

  it("shows Perfect KDA when deaths is 0", () => {
    const match = makeMatchSummary({ kills: 5, deaths: 0, assists: 3 });
    render(<MatchList matches={[match]} region="NA" puuid="test" />);
    expect(screen.getByText("Perfect KDA")).toBeInTheDocument();
  });
});
