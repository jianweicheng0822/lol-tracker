export type Region = "NA" | "EUW" | "KR" | "JP" | "BR" | "OCE";

export const REGIONS: Region[] = ["NA", "EUW", "KR", "JP", "BR", "OCE"];

export type Account = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type MatchParticipant = {
  summonerName: string;
  championName: string;
  puuid: string;
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
  championLevel: number;
  summoner1Id: number;
  summoner2Id: number;
  items: number[];
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  queueId: number;
  teamTotalKills: number;
  allies: MatchParticipant[];
  enemies: MatchParticipant[];
  primaryRuneId: number;
  secondaryRuneStyleId: number;
  augments: number[];
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