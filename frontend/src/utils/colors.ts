/** Shared color palette and semantic color helpers (OP.GG-inspired). */

// --- Base palette ---
export const COLORS = {
  pageBg: "#1c1c1f",
  cardBg: "rgba(35,35,40,0.85)",
  cardBorder: "rgba(255,255,255,0.08)",
  textPrimary: "#FFFFFF",
  textSecondary: "#9AA4AF",
  textTertiary: "#7B7A8E",
  textDim: "#515163",
  divider: "rgba(255,255,255,0.06)",
  gold: "#D4A017",
} as const;

/** Semantic win-rate color: blue for high, green for good, red for bad. */
export function winRateColor(wr: number): string {
  if (wr >= 60) return "#3A8FD6";
  if (wr >= 50) return "#48D1A0";
  return "#E84057";
}

/** Semantic KDA color: orange for exceptional, green for good, gray for ok, red for bad. */
export function kdaColor(kda: number): string {
  if (kda >= 5) return "#F5A623";
  if (kda >= 3) return "#48D1A0";
  if (kda >= 2) return "#9AA4AF";
  return "#E84057";
}
