import { computeStreak, computeRecentForm, computeMainChampion, computeClimbStatus } from "./playerInsights";
import { makeMatchSummary, makeRankedEntry } from "../test/fixtures";

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
  it("returns null when no ranked entries", () => {
    expect(computeClimbStatus([])).toBeNull();
  });

  it("returns null when no solo queue entry", () => {
    expect(computeClimbStatus([makeRankedEntry({ queueType: "RANKED_FLEX_SR" })])).toBeNull();
  });

  it("returns 'climbing' when win rate > 55%", () => {
    expect(computeClimbStatus([makeRankedEntry({ wins: 60, losses: 40 })])).toBe("climbing");
  });

  it("returns 'falling' when win rate < 45%", () => {
    expect(computeClimbStatus([makeRankedEntry({ wins: 40, losses: 60 })])).toBe("falling");
  });

  it("returns 'stable' when win rate is between 45-55%", () => {
    expect(computeClimbStatus([makeRankedEntry({ wins: 50, losses: 50 })])).toBe("stable");
  });

  it("returns null when total games is 0", () => {
    expect(computeClimbStatus([makeRankedEntry({ wins: 0, losses: 0 })])).toBeNull();
  });
});
