/**
 * @file usePageTracking.ts
 * @description Reports each page view to the server for the admin usage metrics.
 * @module frontend.hooks
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../api";
import { externalReferrer, pageName } from "../utils/visitor";

/**
 * Send a page view whenever the path changes (not on tab or query-string changes). The first one
 * also says which site the visitor came from. Does nothing in development, so local testing
 * doesn't show up in the numbers.
 */
export function usePageTracking(enabled = !import.meta.env.DEV) {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    const page = pageName(pathname);
    const referrer = first.current ? externalReferrer(document.referrer, window.location.hostname) : null;
    first.current = false;
    if (page) trackPageView(page, referrer);
  }, [pathname, enabled]);
}
