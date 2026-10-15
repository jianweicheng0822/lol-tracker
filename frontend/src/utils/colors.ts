/**
 * Shared color palette and semantic color helpers.
 *
 * "Hextech" theme: the League of Legends client's navy, gold and teal. Text colors are chosen to
 * stay readable (WCAG contrast >= 4.5) on both the page background and cards.
 */

// --- Base palette ---
export const COLORS = {
  /** Deepest background; the page itself is a navy-to-black gradient (see index.css). */
  pageBg: "#010A13",
  /** Solid navy for surfaces that must hide what's behind them: header, modals, menus. */
  surface: "#0A1428",
  cardBg: "rgba(30,40,45,0.55)",
  cardBorder: "rgba(200,155,60,0.22)",
  textPrimary: "#F0E6D2",
  textSecondary: "#C8C2B2",
  textTertiary: "#A09B8C",
  textDim: "#928E80",
  divider: "rgba(200,170,110,0.12)",
  gold: "#C89B3C",
  /** Cream highlight for gold gradients and active states. */
  goldLight: "#F0E6D2",
  teal: "#0AC8B9",
  loss: "#E84057",
} as const;

/** Semantic win-rate color: gold for excellent, teal for winning, red for losing. */
export function winRateColor(wr: number): string {
  if (wr >= 60) return COLORS.gold;
  if (wr >= 50) return COLORS.teal;
  return COLORS.loss;
}

/** Semantic KDA color: orange for exceptional, teal for good, gray for ok, red for bad. */
export function kdaColor(kda: number): string {
  if (kda >= 5) return "#F5A623";
  if (kda >= 3) return COLORS.teal;
  if (kda >= 2) return COLORS.textTertiary;
  return COLORS.loss;
}
