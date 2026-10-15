/**
 * @file useDocumentTitle.ts
 * @description Sets the browser tab title for the current page.
 * @module frontend.hooks
 */
import { useEffect } from "react";

export const SITE_NAME = "LoL Tracker";

/** Title for the home page and pages without their own; keep in sync with <title> in index.html. */
export const DEFAULT_TITLE = "LoL Tracker: League of Legends Stats & Match History";

/**
 * Show "<title> · LoL Tracker" in the browser tab, or {@link DEFAULT_TITLE} when there's no title
 * (yet). Resets to the default when the page unmounts, so pages without a title don't keep the
 * previous page's.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  }, [title]);

  useEffect(() => () => {
    document.title = DEFAULT_TITLE;
  }, []);
}
