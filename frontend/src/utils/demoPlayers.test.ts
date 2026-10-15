import { describe, it, expect } from "vitest";
import { pickDemoPlayers } from "./demoPlayers";
import type { LeaderboardEntry } from "../types";

function entry(summonerName: string, puuid: string): LeaderboardEntry {
  return { summonerName, puuid, tier: "CHALLENGER", rank: "I", leaguePoints: 1000, wins: 1, losses: 1, winRate: 50 };
}

describe("pickDemoPlayers", () => {
  const entries = [entry("A#NA1", "a"), entry("B#NA1", "b"), entry("C#NA1", "c"), entry("D#NA1", "d")];

  it("picks the requested number of distinct players, labelled as 'Name #Tag'", () => {
    const picks = pickDemoPlayers(entries, "NA", 2);
    expect(picks).toHaveLength(2);
    expect(new Set(picks.map((p) => p.puuid)).size).toBe(2);
    for (const p of picks) {
      expect(p.label).toMatch(/^[A-D] #NA1$/);
      expect(p.region).toBe("NA");
    }
  });

  it("is random but deterministic for a given random source", () => {
    // random() = 0 keeps the order; 0.99 swaps each slot with the last entry: [d,b,c,a] then [d,a,c,b]
    expect(pickDemoPlayers(entries, "NA", 2, () => 0).map((p) => p.puuid)).toEqual(["a", "b"]);
    expect(pickDemoPlayers(entries, "NA", 2, () => 0.99).map((p) => p.puuid)).toEqual(["d", "a"]);
  });

  it("skips entries without a Riot ID or PUUID", () => {
    const picks = pickDemoPlayers([entry("NoTag", "x"), entry("Ok#NA1", ""), entry("Good#NA1", "g")], "NA", 2);
    expect(picks.map((p) => p.puuid)).toEqual(["g"]);
  });

  it("returns what it can when there are fewer entries than requested", () => {
    expect(pickDemoPlayers([], "NA", 2)).toEqual([]);
  });
});
