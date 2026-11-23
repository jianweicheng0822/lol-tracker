/**
 * Remembers which page the user was on when they clicked "Link" for Google/Discord, so the
 * OAuth callback can send them back there instead of to the home page.
 */
const KEY = "lol_link_return";

export function saveLinkReturnPath(path: string): void {
  try { sessionStorage.setItem(KEY, path); } catch { /* storage blocked: they land on the home page */ }
}

/** Read and forget the saved page. Falls back to "/" and only ever returns a same-site path. */
export function takeLinkReturnPath(): string {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    // "//evil.example" is a protocol-relative URL to another site, not a path here
    if (path && path.startsWith("/") && !path.startsWith("//")) return path;
  } catch { /* storage blocked */ }
  return "/";
}
