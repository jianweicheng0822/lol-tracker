/**
 * @file demoPlayers.ts
 * @description Pick the "Try searching" example players shown on the home page.
 * @module frontend.utils
 */
import type { LeaderboardEntry } from "../types";

export type DemoPlayer = { label: string; puuid: string; region: string };

/** Shown until the leaderboard loads, or if it can't be loaded. */
export const FALLBACK_DEMO_PLAYERS: DemoPlayer[] = [
  { label: "C9 Loki #kr3", puuid: "YdeyIKCDDnlZ3jNZ4OQue9ChPbyO3yFq9O0S4r10GEUpoS47QEDfrnrqIDG0rLruHeBaHAaDcA8mgA", region: "NA" },
];

/**
 * Pick `count` random players from leaderboard entries. Leaderboard players are always active,
 * unlike a hard-coded example that goes stale or gets renamed. Entries without a Riot ID
 * ("Name#Tag") are skipped, since the label would be meaningless.
 *
 * @param random - Injected for tests; defaults to Math.random.
 */
export function pickDemoPlayers(
  entries: LeaderboardEntry[],
  region: string,
  count = 2,
  random: () => number = Math.random,
): DemoPlayer[] {
  const pool = entries.filter((e) => e.puuid && e.summonerName.includes("#"));
  // Partial Fisher-Yates: shuffle just the first `count` slots
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map((e) => ({
    label: e.summonerName.replace("#", " #"),
    puuid: e.puuid,
    region,
  }));
}
