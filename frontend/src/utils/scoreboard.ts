/**
 * @file scoreboard.ts
 * @description Ordering for match scoreboards.
 * @module frontend.utils
 */
import type { MatchDetail } from "../types";

/** The match's teams with the given player's team first (unchanged order if they didn't play). */
export function teamsWithPlayerFirst(match: MatchDetail, puuid: string | undefined): MatchDetail["teams"] {
  const myTeamId = match.participants.find((p) => p.puuid === puuid)?.teamId;
  return [...match.teams].sort((a, b) => {
    if (a.teamId === myTeamId) return -1;
    if (b.teamId === myTeamId) return 1;
    return 0;
  });
}
