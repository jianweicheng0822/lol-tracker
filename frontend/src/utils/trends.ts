/**
 * Pure helper functions for computing trend data used by Recharts line charts.
 * These operate on arrays of raw values and return arrays of the same length,
 * with `null` for positions where the window hasn't accumulated enough data.
 */

/**
 * Computes a simple moving average over a sliding window.
 * Returns null for the first (window - 1) entries where the window isn't full.
 *
 * Example: movingAverage([2, 4, 6, 8, 10], 3) → [null, null, 4, 6, 8]
 */
export function movingAverage(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null; // Not enough data points yet
    const slice = data.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/**
 * Computes a rolling win rate percentage over a sliding window of booleans.
 * Returns null for the first (window - 1) entries.
 *
 * Example: rollingWinRate([true, false, true, true, false], 3) → [null, null, 67, 67, 67]
 */
export function rollingWinRate(wins: boolean[], window: number): (number | null)[] {
  return wins.map((_, i) => {
    if (i < window - 1) return null; // Not enough games yet
    const slice = wins.slice(i - window + 1, i + 1);
    const winCount = slice.filter(Boolean).length;
    return Math.round((winCount / slice.length) * 100);
  });
}
