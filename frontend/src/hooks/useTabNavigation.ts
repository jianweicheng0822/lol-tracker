/**
 * @file useTabNavigation.ts
 * @description Hook for URL-driven tab navigation on the player dashboard.
 * @module frontend.hooks
 */

/**
 * Manage active tab state via URL search parameters for browser back/forward support.
 *
 * Read the active tab from the `?tab=` URL search parameter and provide
 * a setter that pushes new history entries. Defaults to "overview" if the
 * param is missing or invalid.
 *
 * @returns tuple of [activeTab, setTab] for reading and updating the current tab
 */
import { useSearchParams } from "react-router-dom";
import type { TabId } from "../types";

/** Whitelist of valid tab IDs — anything else falls back to "overview". */
const VALID_TABS: TabId[] = ["overview", "performance", "champions", "match-history"];

export function useTabNavigation(): [TabId, (tab: TabId) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read and validate the current tab from URL params
  const raw = searchParams.get("tab") || "overview";
  const activeTab: TabId = VALID_TABS.includes(raw as TabId) ? (raw as TabId) : "overview";

  // Push a new history entry (replace: false) so browser back/forward navigates between tabs
  const setTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: false });
  };

  return [activeTab, setTab];
}
