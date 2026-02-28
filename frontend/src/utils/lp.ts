const TIER_VALUES: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 2800,
  CHALLENGER: 2800,
};

const RANK_VALUES: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

export function toAbsoluteLp(tier: string, rank: string, lp: number): number {
  const tierBase = TIER_VALUES[tier.toUpperCase()] ?? 0;
  const rankBase = RANK_VALUES[rank.toUpperCase()] ?? 0;
  // Apex tiers (Master+) have no divisions, LP stacks directly
  const isApex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier.toUpperCase());
  return tierBase + (isApex ? lp : rankBase + lp);
}
