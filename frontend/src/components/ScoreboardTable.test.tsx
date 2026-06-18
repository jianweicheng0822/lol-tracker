import { render, screen } from "@testing-library/react";
import { ScoreboardTeamTable, ArenaScoreboard } from "./ScoreboardTable";
import { makeMatchDetailParticipant, makeMatchTeam } from "../test/fixtures";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../utils/ddragon", () => ({
  championIconUrl: (name: string) => `${name}.png`,
  itemIconUrl: (id: number) => `item_${id}.png`,
  spellIconUrl: (id: number) => `spell_${id}.png`,
  keystoneIconUrl: (id: number) => `keystone_${id}.png`,
  runeStyleIconUrl: (id: number) => `runestyle_${id}.png`,
  hideOnError: vi.fn(),
}));

describe("ScoreboardTeamTable", () => {
  const baseProps = {
    team: makeMatchTeam({ win: true }),
    participants: [
      makeMatchDetailParticipant({ puuid: "p1", summonerName: "Player1", kills: 10, deaths: 2, assists: 5 }),
      makeMatchDetailParticipant({ puuid: "p2", summonerName: "Player2", kills: 3, deaths: 5, assists: 8, pentaKills: 1 }),
    ],
    imgBase: "https://example.com/img",
    queueId: 420,
    region: "NA",
  };

  it("renders Victory header for winning team", () => {
    render(<ScoreboardTeamTable {...baseProps} />);
    expect(screen.getByText("Victory")).toBeInTheDocument();
  });

  it("renders Defeat header for losing team", () => {
    render(<ScoreboardTeamTable {...baseProps} team={makeMatchTeam({ win: false })} />);
    expect(screen.getByText("Defeat")).toBeInTheDocument();
  });

  it("renders player names", () => {
    render(<ScoreboardTeamTable {...baseProps} />);
    expect(screen.getByText("Player1")).toBeInTheDocument();
    expect(screen.getByText("Player2")).toBeInTheDocument();
  });

  it("shows KDA values for each player", () => {
    render(<ScoreboardTeamTable {...baseProps} />);
    // Player1: 10/2/5 — kills and assists rendered inline with spans
    expect(screen.getByText("Player1")).toBeInTheDocument();
    // KDA ratio text: "7.5" for (10+5)/2
    expect(screen.getByText("7.5")).toBeInTheDocument();
  });

  it("renders PENTA multi-kill badge", () => {
    render(<ScoreboardTeamTable {...baseProps} />);
    expect(screen.getByText("PENTA")).toBeInTheDocument();
  });

  it("renders QUADRA badge when no penta", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "p1", quadraKills: 2, pentaKills: 0 }),
    ];
    render(<ScoreboardTeamTable {...baseProps} participants={participants} />);
    expect(screen.getByText("QUADRA")).toBeInTheDocument();
  });

  it("renders TRIPLE badge", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "p1", tripleKills: 1, quadraKills: 0, pentaKills: 0 }),
    ];
    render(<ScoreboardTeamTable {...baseProps} participants={participants} />);
    expect(screen.getByText("TRIPLE")).toBeInTheDocument();
  });

  it("renders DOUBLE badge", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "p1", doubleKills: 3, tripleKills: 0, quadraKills: 0, pentaKills: 0 }),
    ];
    render(<ScoreboardTeamTable {...baseProps} participants={participants} />);
    expect(screen.getByText("DOUBLE")).toBeInTheDocument();
  });

  it("shows wards column for non-ARAM matches", () => {
    render(<ScoreboardTeamTable {...baseProps} queueId={420} />);
    expect(screen.getByText("Wards")).toBeInTheDocument();
  });

  it("hides wards column for ARAM matches", () => {
    render(<ScoreboardTeamTable {...baseProps} queueId={450} />);
    expect(screen.queryByText("Wards")).not.toBeInTheDocument();
  });

  it("highlights the current player row", () => {
    render(<ScoreboardTeamTable {...baseProps} highlightPuuid="p1" />);
    const playerName = screen.getByText("Player1");
    expect(playerName).toHaveStyle({ fontWeight: 700 });
  });

  it("shows CS (totalMinionsKilled + neutralMinionsKilled)", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "p1", totalMinionsKilled: 150, neutralMinionsKilled: 30 }),
    ];
    render(<ScoreboardTeamTable {...baseProps} participants={participants} />);
    expect(screen.getByText("180")).toBeInTheDocument();
  });
});

describe("ArenaScoreboard", () => {
  it("groups participants by playerSubteamId", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "a1", playerSubteamId: 1, placement: 1, summonerName: "Winner1" }),
      makeMatchDetailParticipant({ puuid: "a2", playerSubteamId: 1, placement: 1, summonerName: "Winner2" }),
      makeMatchDetailParticipant({ puuid: "b1", playerSubteamId: 2, placement: 2, summonerName: "Second1" }),
      makeMatchDetailParticipant({ puuid: "b2", playerSubteamId: 2, placement: 2, summonerName: "Second2" }),
    ];
    render(<ArenaScoreboard participants={participants} imgBase="https://example.com/img" />);
    expect(screen.getByText("Winner1")).toBeInTheDocument();
    expect(screen.getByText("Second1")).toBeInTheDocument();
  });

  it("sorts teams by placement", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "b1", playerSubteamId: 2, placement: 3, summonerName: "Third" }),
      makeMatchDetailParticipant({ puuid: "a1", playerSubteamId: 1, placement: 1, summonerName: "First" }),
    ];
    render(<ArenaScoreboard participants={participants} imgBase="https://example.com/img" />);
    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("3rd")).toBeInTheDocument();
  });

  it("renders placement labels correctly", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "a1", playerSubteamId: 1, placement: 1 }),
      makeMatchDetailParticipant({ puuid: "b1", playerSubteamId: 2, placement: 2 }),
      makeMatchDetailParticipant({ puuid: "c1", playerSubteamId: 3, placement: 3 }),
      makeMatchDetailParticipant({ puuid: "d1", playerSubteamId: 4, placement: 4 }),
    ];
    render(<ArenaScoreboard participants={participants} imgBase="https://example.com/img" />);
    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.getByText("3rd")).toBeInTheDocument();
    expect(screen.getByText("4th")).toBeInTheDocument();
  });

  it("highlights the player's team", () => {
    const participants = [
      makeMatchDetailParticipant({ puuid: "me", playerSubteamId: 1, placement: 1, summonerName: "Me" }),
      makeMatchDetailParticipant({ puuid: "other", playerSubteamId: 2, placement: 2, summonerName: "Other" }),
    ];
    render(<ArenaScoreboard participants={participants} imgBase="https://example.com/img" highlightPuuid="me" />);
    const myName = screen.getByText("Me");
    expect(myName).toHaveStyle({ fontWeight: 700 });
  });
});
