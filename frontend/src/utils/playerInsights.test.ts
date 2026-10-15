import { computeStreak, computeRecentForm, computeMainChampion, computeClimbStatus, rankedScopeLabel } from "./playerInsights";
import { makeMatchSummary } from "../test/fixtures";

describe("computeStreak", () => {
  it("returns null for empty matches", () => {
    expect(computeStreak([])).toBeNull();
  });

  it("returns null when no streak (alternating results)", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
    ];
    expect(computeStreak(matches)).toBeNull();
  });

  it("detects a win streak", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
    ];
    expect(computeStreak(matches)).toEqual({ type: "win", count: 3 });
  });

  it("detects a loss streak", () => {
    const matches = [
      makeMatchSummary({ win: false }),
      makeMatchSummary({ win: false }),
      makeMatchSummary({ win: true }),
    ];
    expect(computeStreak(matches)).toEqual({ type: "loss", count: 2 });
  });

  it("counts full streak when all matches same result", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: true }),
    ];
    expect(computeStreak(matches)).toEqual({ type: "win", count: 3 });
  });
});

describe("computeRecentForm", () => {
  it("returns zeros for empty matches", () => {
    expect(computeRecentForm([])).toEqual({ wins: 0, losses: 0, winRate: 0 });
  });

  it("computes form for last 5 games", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
      makeMatchSummary({ win: true }), // beyond window
    ];
    const form = computeRecentForm(matches, 5);
    expect(form.wins).toBe(3);
    expect(form.losses).toBe(2);
    expect(form.winRate).toBe(60);
  });

  it("handles fewer matches than window", () => {
    const matches = [
      makeMatchSummary({ win: true }),
      makeMatchSummary({ win: false }),
    ];
    const form = computeRecentForm(matches, 5);
    expect(form.wins).toBe(1);
    expect(form.losses).toBe(1);
    expect(form.winRate).toBe(50);
  });
});

describe("computeMainChampion", () => {
  it("returns null for empty matches", () => {
    expect(computeMainChampion([])).toBeNull();
  });

  it("returns the most-played champion", () => {
    const matches = [
      makeMatchSummary({ championName: "Ahri", win: true }),
      makeMatchSummary({ championName: "Ahri", win: false }),
      makeMatchSummary({ championName: "Ahri", win: true }),
      makeMatchSummary({ championName: "Zed", win: true }),
    ];
    const result = computeMainChampion(matches);
    expect(result).toEqual({ name: "Ahri", games: 3, winRate: 67 });
  });

  it("returns single champion when only one played", () => {
    const matches = [makeMatchSummary({ championName: "Jinx", win: true })];
    expect(computeMainChampion(matches)).toEqual({ name: "Jinx", games: 1, winRate: 100 });
  });
});

describe("computeClimbStatus", () => {
  const NOW = 1_800_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;
  /** Builds solo-queue games, most recent first, from a win/loss pattern like "WWLW". */
  const soloGames = (pattern: string, endedDaysAgo = 1) =>
    pattern.split("").map((r, i) =>
      makeMatchSummary({ queueId: 420, win: r === "W", gameEndTimestamp: NOW - (endedDaysAgo + i) * DAY }));

  it("returns null with no matches", () => {
    expect(computeClimbStatus([], NOW)).toBeNull();
  });

  it("returns null with fewer than 5 recent solo games", () => {
    expect(computeClimbStatus(soloGames("WWWW"), NOW)).toBeNull();
  });

  it("returns 'climbing' when recent solo win rate > 55%", () => {
    expect(computeClimbStatus(soloGames("WWWLW"), NOW)).toBe("climbing");
  });

  it("returns 'falling' when recent solo win rate < 45%", () => {
    expect(computeClimbStatus(soloGames("LLWLL"), NOW)).toBe("falling");
  });

  it("returns 'stable' when recent solo win rate is between 45-55%", () => {
    expect(computeClimbStatus(soloGames("WLWLWL"), NOW)).toBe("stable");
  });

  it("returns null when the latest solo game is over 30 days old", () => {
    // A strong record from months ago should not label an inactive player as climbing
    expect(computeClimbStatus(soloGames("WWWWWW", 145), NOW)).toBeNull();
  });

  it("ignores non-solo queues", () => {
    const arenaWins = Array.from({ length: 5 }, () =>
      makeMatchSummary({ queueId: 1750, win: true, gameEndTimestamp: NOW - DAY }));
    expect(computeClimbStatus([...arenaWins, ...soloGames("LLLLL")], NOW)).toBe("falling");
    expect(computeClimbStatus(arenaWins, NOW)).toBeNull();
  });

  it("only considers the last 20 solo games", () => {
    // 20 recent losses followed by older wins: only the losses count
    expect(computeClimbStatus(soloGames("L".repeat(20) + "W".repeat(20)), NOW)).toBe("falling");
  });
});

describe("rankedScopeLabel", () => {
  it("describes which games the stats cover", () => {
    expect(rankedScopeLabel(20, 20)).toBe("Last 20 ranked games");
    expect(rankedScopeLabel(18, 20)).toBe("18 ranked games in the last 20");
    expect(rankedScopeLabel(1, 3)).toBe("1 ranked game in the last 3");
  });
});
