export type Region = "NA" | "EUW" | "KR" | "JP" | "BR" | "OCE";

export const REGIONS: Region[] = ["NA", "EUW", "KR", "JP", "BR", "OCE"];

export type Account = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type MatchSummary = {
  matchId: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  gameDurationSec: number;
  gameEndTimestamp: number;
};

export type PlayerStats = {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKills: number;
  averageDeaths: number;
  averageAssists: number;
  averageKda: number;
};

export type RankedEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type FavoritePlayer = {
  id: number;
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
  savedAt: string;
};