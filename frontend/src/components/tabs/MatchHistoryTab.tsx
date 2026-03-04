/**
 * Match History tab — thin wrapper around the existing MatchList component.
 * Passes through all match data, pagination callbacks, and player context.
 * The MatchList component handles rendering, inline scoreboard expansion, and load-more.
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
};

export default function MatchHistoryTab({ matches, region, puuid, gameName, onLoadMore, isLoadingMore, hasMore }: Props) {
  return (
    <MatchList
      matches={matches}
      region={region}
      puuid={puuid}
      gameName={gameName}
      onLoadMore={onLoadMore}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
    />
  );
}
