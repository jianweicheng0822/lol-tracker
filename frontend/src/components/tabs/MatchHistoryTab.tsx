/**
 * @file MatchHistoryTab.tsx
 * @description Thin wrapper around the MatchList component for the Match History tab.
 *   Pass through all match data, pagination callbacks, and player context to MatchList
 *   which handles rendering, inline scoreboard expansion, and load-more.
 * @module frontend.components.tabs
 */
import MatchList from "../MatchList";
import type { MatchSummary } from "../../types";

type Props = {
  matches: MatchSummary[];
  region: string;
  puuid: string;
  gameName: string;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  tier?: number;
};

/**
 * Render the Match History tab by delegating to the MatchList component.
 *
 * @param props - Match data, player context, pagination state, and subscription tier.
 * @returns The match history tab content element.
 */
export default function MatchHistoryTab({ matches, region, puuid, gameName, onLoadMore, isLoadingMore, hasMore, tier }: Props) {
  return (
    <MatchList
      matches={matches}
      region={region}
      puuid={puuid}
      gameName={gameName}
      onLoadMore={onLoadMore}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      tier={tier}
    />
  );
}
