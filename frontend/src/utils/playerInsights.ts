/**
 * @file playerInsights.ts
 * @description Derived player analytics including win/loss streaks and climb status calculations.
 * @module frontend.utils
 */
import type { MatchSummary } from "../types";

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

const CLIMB_MIN_GAMES = 5;
const CLIMB_MAX_GAMES = 20;
const CLIMB_ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Determine climb status from recent Ranked Solo/Duo form (matches ordered most recent first).
 * Uses up to the last 20 solo games: >55% win rate = climbing, <45% = falling, otherwise stable.
 * Returns null with fewer than 5 recent solo games, or if the latest one is over 30 days old,
 * so inactive players aren't labeled by stale season-long results.
 */
export function computeClimbStatus(
  matches: MatchSummary[],
  now: number = Date.now(),
): "climbing" | "falling" | "stable" | null {
  const solo = matches.filter((m) => m.queueId === 420).slice(0, CLIMB_MAX_GAMES);
  if (solo.length < CLIMB_MIN_GAMES) return null;
  if (now - solo[0].gameEndTimestamp > CLIMB_ACTIVE_WINDOW_MS) return null;
  const wins = solo.filter((m) => m.win).length;
  const wr = (wins / solo.length) * 100;
  if (wr > 55) return "climbing";
  if (wr < 45) return "falling";
  return "stable";
}

/**
 * Which games the sidebar stats cover. "Last 18 ranked games" read like a bug when it meant that 18
 * of the last 20 games were ranked, so say that.
 */
export function rankedScopeLabel(ranked: number, sampled: number): string {
  const games = (n: number) => `${n} ranked ${n === 1 ? "game" : "games"}`;
  return ranked === sampled ? `Last ${games(ranked)}` : `${games(ranked)} in the last ${sampled}`;
}
