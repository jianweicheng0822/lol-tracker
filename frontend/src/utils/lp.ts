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

/** Canonical solid colors for each ranked tier. */
export const TIER_COLORS: Record<string, string> = {
  IRON: "#78645A",
  BRONZE: "#8C6440",
  SILVER: "#A0AAB4",
  GOLD: "#C8AA3C",
  PLATINUM: "#50B4A0",
  EMERALD: "#28B464",
  DIAMOND: "#6490DC",
  MASTER: "#A064DC",
  GRANDMASTER: "#DC5050",
  CHALLENGER: "#F0C850",
};

/** Semi-transparent tints derived from TIER_COLORS, for card backgrounds. */
export const TIER_TINTS: Record<string, string> = {
  IRON: "rgba(120,100,90,0.12)",
  BRONZE: "rgba(140,100,60,0.12)",
  SILVER: "rgba(160,170,180,0.12)",
  GOLD: "rgba(200,170,60,0.14)",
  PLATINUM: "rgba(80,180,160,0.12)",
  EMERALD: "rgba(40,180,100,0.12)",
  DIAMOND: "rgba(100,140,220,0.14)",
  MASTER: "rgba(160,100,220,0.14)",
  GRANDMASTER: "rgba(220,80,80,0.14)",
  CHALLENGER: "rgba(240,200,80,0.14)",
};

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

/**
 * Returns true if `outerDays` range contains at least one snapshot
 * that falls outside `innerDays` — i.e., there is additional data
 * between innerDays ago and outerDays ago.
 */
export function hasDataBeyond(snapshots: { capturedAt: number }[], innerDays: number, outerDays: number): boolean {
  const now = Date.now();
  const innerCutoff = now - innerDays * 86_400_000;
  const outerCutoff = now - outerDays * 86_400_000;
  return snapshots.some((s) => s.capturedAt < innerCutoff && s.capturedAt >= outerCutoff);
}

/** Filters snapshots to only those within the last `days` days. */
export function filterByRange<T extends { capturedAt: number }>(snapshots: T[], days: number): T[] {
  const cutoff = Date.now() - days * 86_400_000;
  return snapshots.filter((s) => s.capturedAt >= cutoff);
}

const TIER_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

/** Small ranked crest for a tier (Emerald only exists as SVG). */
export function tierIconUrl(tier: string): string {
  const ext = tier.toUpperCase() === "EMERALD" ? "svg" : "png";
  return `${TIER_ICON_BASE}/${tier.toLowerCase()}.${ext}`;
}

const APEX_BASE = 2800;
const DIVISIONS = ["IV", "III", "II", "I"];
const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"];

/** "Diamond II" below Master, just "Grandmaster" for apex tiers. */
export function formatRank(tier: string, rank: string): string {
  const t = tier.charAt(0) + tier.slice(1).toLowerCase();
  return ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier.toUpperCase()) ? t : `${t} ${rank}`;
}

/** "today", "yesterday" or "on Sep 17", for "Tracking started …". */
export function startedDay(timestamp: number): string {
  const day = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const days = Math.round((day(Date.now()) - day(timestamp)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `on ${formatShortDate(timestamp)}`;
}

/** "Sep 17" for chart axes and captions. */
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Y axis for an LP chart over absolute LP values (see {@link toAbsoluteLp}).
 * Master and above have no divisions, so the axis counts LP ("1,200 LP"); below that it marks
 * divisions ("Gold II"), or only tiers when the range is too wide for every division to fit.
 */
export function lpAxis(values: number[]): { domain: [number, number]; ticks: number[]; format: (v: number) => string } {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min >= APEX_BASE) {
    // Fit the data closely, then label round numbers inside it (about 4)
    const pad = Math.max((max - min) * 0.12, 15);
    const lo = Math.floor(min - pad);
    const hi = Math.ceil(max + pad);
    const step = [10, 25, 50, 100, 200, 250, 500, 1000].find((s) => (hi - lo) / s <= 4) ?? 1000;
    const ticks: number[] = [];
    // Round numbers in LP above Master, not in absolute LP
    for (let v = APEX_BASE + Math.ceil((lo - APEX_BASE) / step) * step; v <= hi; v += step) ticks.push(v);
    return { domain: [lo, hi], ticks, format: (v) => `${(v - APEX_BASE).toLocaleString()} LP` };
  }

  const lo = Math.floor((min - 50) / 100) * 100;
  const hi = Math.ceil((max + 50) / 100) * 100;
  const divisions = (hi - lo) / 100;
  const step = divisions > 8 ? 400 : divisions > 4 ? 200 : 100;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const format = (v: number) => {
    if (v >= APEX_BASE) return `${(v - APEX_BASE).toLocaleString()} LP`;
    const tier = TIER_ORDER[Math.floor(v / 400)] ?? "IRON";
    return step === 400 ? formatRank(tier, "").trim() : formatRank(tier, DIVISIONS[Math.floor((v % 400) / 100)]);
  };
  return { domain: [lo, hi], ticks, format };
}

/** `count` evenly spaced timestamps from `start` to `end`, for a time axis that shouldn't label every point. */
export function timeTicks(start: number, end: number, count = 5): number[] {
  if (end <= start) return [start];
  return Array.from({ length: count }, (_, i) => Math.round(start + ((end - start) * i) / (count - 1)));
}
