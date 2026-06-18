import type { MatchSummary, RankedEntry } from "../types";

export type Streak = { type: "win" | "loss"; count: number };

/**
 * Count consecutive same-result matches from the start of the array (most recent first).
 */
export function computeStreak(matches: MatchSummary[]): Streak | null {
  if (matches.length === 0) return null;
  const first = matches[0].win;
  let count = 1;
  for (let i = 1; i < matches.length; i++) {
    if (matches[i].win !== first) break;
    count++;
  }
  if (count < 2) return null;
  return { type: first ? "win" : "loss", count };
}

/**
 * Last N games performance summary.
 */
export function computeRecentForm(
  matches: MatchSummary[],
  window = 5,
): { wins: number; losses: number; winRate: number } {
  const slice = matches.slice(0, window);
  if (slice.length === 0) return { wins: 0, losses: 0, winRate: 0 };
  const wins = slice.filter((m) => m.win).length;
  const losses = slice.length - wins;
  return { wins, losses, winRate: Math.round((wins / slice.length) * 100) };
}

/**
 * Most-played champion across matches.
 */
export function computeMainChampion(
  matches: MatchSummary[],
): { name: string; games: number; winRate: number } | null {
  if (matches.length === 0) return null;
  const map = new Map<string, { games: number; wins: number }>();
  for (const m of matches) {
    const entry = map.get(m.championName) ?? { games: 0, wins: 0 };
    entry.games++;
    if (m.win) entry.wins++;
    map.set(m.championName, entry);
  }
  let best: { name: string; games: number; wins: number } | null = null;
  for (const [name, data] of map) {
    if (!best || data.games > best.games) {
      best = { name, ...data };
    }
  }
  if (!best) return null;
  return { name: best.name, games: best.games, winRate: Math.round((best.wins / best.games) * 100) };
}

/**
 * Determine climb status based on ranked win rate.
 * >55% = climbing, <45% = falling, otherwise stable.
 */
export function computeClimbStatus(
  ranked: RankedEntry[],
): "climbing" | "falling" | "stable" | null {
  const solo = ranked.find((e) => e.queueType === "RANKED_SOLO_5x5");
  if (!solo) return null;
  const total = solo.wins + solo.losses;
  if (total === 0) return null;
  const wr = (solo.wins / total) * 100;
  if (wr > 55) return "climbing";
  if (wr < 45) return "falling";
  return "stable";
}
