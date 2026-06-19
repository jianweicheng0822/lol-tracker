/**
 * @file lp.ts
 * @description LP (League Points) conversion utilities for LP progression charts.
 * @module frontend.utils
 *
 * The Riot ranked system uses tier + division + LP (e.g., "Gold II 45 LP").
 * To plot LP on a single Y-axis, convert this into a flat number:
 *   Iron IV 0 LP = 0,  Iron III 0 LP = 100,  Bronze IV 0 LP = 400, ...
 *
 * Each tier spans 400 LP (4 divisions x 100 LP each).
 * Apex tiers (Master, Grandmaster, Challenger) share a base of 2800
 * and stack LP directly since they have no divisions.
 */

/** Base LP value for each tier — each non-apex tier is 400 LP wide. */
export const TIER_VALUES: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,       // Apex tiers share the same base
  GRANDMASTER: 2800,
  CHALLENGER: 2800,
};

/** LP offset for each division within a tier (IV is lowest, I is highest). */
const RANK_VALUES: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

/**
 * Converts a tier + rank + LP into a single absolute LP number for chart plotting.
 * Example: toAbsoluteLp("GOLD", "II", 45) → 1200 + 200 + 45 = 1445
 * Example: toAbsoluteLp("MASTER", "", 150) → 2800 + 150 = 2950
 */
export function toAbsoluteLp(tier: string, rank: string, lp: number): number {
  const tierBase = TIER_VALUES[tier.toUpperCase()] ?? 0;
  const rankBase = RANK_VALUES[rank.toUpperCase()] ?? 0;
  // Apex tiers (Master+) have no divisions — LP stacks directly on the base
  const isApex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier.toUpperCase());
  return tierBase + (isApex ? lp : rankBase + lp);
}

/** Available time ranges (in days) for LP charts. */
export const LP_TIME_RANGES = [30, 60, 90, 180] as const;
export type LpTimeRange = (typeof LP_TIME_RANGES)[number];

/**
 * Returns the number of items in `snapshots` whose `capturedAt` falls
 * within the last `days` days from now.
 */
export function countInRange(snapshots: { capturedAt: number }[], days: number): number {
  const cutoff = Date.now() - days * 86_400_000;
  return snapshots.filter((s) => s.capturedAt >= cutoff).length;
}

/**
 * Picks the first time range that contains >= 2 data points.
 * Falls back to 180 (largest range) if none qualifies.
 */
export function pickDefaultRange(snapshots: { capturedAt: number }[]): LpTimeRange {
  for (const r of LP_TIME_RANGES) {
    if (countInRange(snapshots, r) >= 2) return r;
  }
  return 180;
}

/** Filters snapshots to only those within the last `days` days. */
export function filterByRange<T extends { capturedAt: number }>(snapshots: T[], days: number): T[] {
  const cutoff = Date.now() - days * 86_400_000;
  return snapshots.filter((s) => s.capturedAt >= cutoff);
}
