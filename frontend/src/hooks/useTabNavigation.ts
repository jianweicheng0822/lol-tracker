import { useSearchParams } from "react-router-dom";
import type { TabId } from "../types";

const VALID_TABS: TabId[] = ["overview", "performance", "champions", "match-history"];

export function useTabNavigation(): [TabId, (tab: TabId) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("tab") || "overview";
  const activeTab: TabId = VALID_TABS.includes(raw as TabId) ? (raw as TabId) : "overview";

  const setTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: false });
  };

  return [activeTab, setTab];
}
