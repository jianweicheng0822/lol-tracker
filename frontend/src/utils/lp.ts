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
const TIER_VALUES: Record<string, number> = {
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
