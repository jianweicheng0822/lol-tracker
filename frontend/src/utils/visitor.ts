/**
 * @file visitor.ts
 * @description Anonymous visitor id and page names for usage metrics.
 * @module frontend.utils
 */

const VISITOR_KEY = "lol_tracker_vid";

let memoryId: string | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/**
 * A random id for this browser, kept in localStorage so the server can tell new visitors from
 * returning ones. It says nothing about who the person is. Falls back to an id for this tab
 * when storage is blocked.
 */
export function getVisitorId(): string {
  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    if (stored && /^[A-Za-z0-9-]{16,64}$/.test(stored)) return stored;
    const id = randomId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    if (!memoryId) memoryId = randomId();
    return memoryId;
  }
}

/**
 * The kind of page a path is, as reported to the server. Player names and match ids are left
 * out. Null for pages that aren't counted (admin pages, the OAuth hop).
 */
export function pageName(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/admin") || pathname.startsWith("/oauth-callback")) return null;
  if (pathname.startsWith("/player/")) return "player";
  if (pathname.startsWith("/match/")) return "match";
  if (pathname.startsWith("/live/")) return "live";
  if (pathname === "/leaderboard") return "leaderboard";
  if (pathname === "/multi-search") return "multi_search";
  if (pathname.startsWith("/checkout/")) return "checkout";
  return "not_found";
}

/** The referring site's host, or null when there's none or it's this site. */
export function externalReferrer(referrer: string, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname;
    return host && host !== ownHost ? host : null;
  } catch {
    return null;
  }
}
