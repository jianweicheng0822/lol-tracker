/**
 * @file useDocumentTitle.ts
 * @description Sets the browser tab title for the current page.
 * @module frontend.hooks
 */
import { useEffect } from "react";

export const SITE_NAME = "LoL Tracker";

/**
 * Show "<title> · LoL Tracker" in the browser tab, or just "LoL Tracker" when there's no title
 * (yet). Resets to "LoL Tracker" when the page unmounts, so pages without a title don't keep
 * the previous page's.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);

  useEffect(() => () => {
    document.title = SITE_NAME;
  }, []);
}
