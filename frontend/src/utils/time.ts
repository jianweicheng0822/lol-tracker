/**
 * @file time.ts
 * @description Small time formatting helpers.
 * @module frontend.utils
 */

/** "Updated just now", "Updated 5 min ago", "Updated 2 h ago". */
export function formatUpdatedAgo(timestamp: number, now: number): string {
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  return `Updated ${Math.floor(minutes / 60)} h ago`;
}
