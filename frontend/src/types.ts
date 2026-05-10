/**
 * @file types.ts
 * @description Shared TypeScript type definitions for Riot API data models, match history,
 *   player stats, ranked entries, and UI state used across the frontend application.
 * @module frontend.types
 */

/** Supported Riot API region codes. */
export type Region = "NA" | "EUW" | "KR" | "JP" | "BR" | "OCE";

/** Ordered list of all supported regions for the region selector dropdown. */
export const REGIONS: Region[] = ["NA", "EUW", "KR", "JP", "BR", "OCE"];

/** Summoner account resolved from a Riot ID lookup. */
export type Account = {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
};

/** Participant entry within a match summary — used for team roster display. */
export type MatchParticipant = {
  summonerName: string;
  riotIdTagline?: string;
  championName: string;
  puuid: string;
};

/** Summarized match data for the match history list cards. */
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
  placement: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
};

/** Aggregated player statistics computed over recent matches. */
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

/** A single ranked queue entry with tier, division, LP, and win/loss record. */
export type RankedEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

/** Full participant detail within a match scoreboard. */
export type MatchDetailParticipant = {
  summonerName: string;
  riotIdTagline?: string;
  championName: string;
  puuid: string;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  championLevel: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  items: number[];
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  summoner1Id: number;
  summoner2Id: number;
  primaryRuneId: number;
  secondaryRuneStyleId: number;
  wardsPlaced: number;
  wardsKilled: number;
  visionWardsBoughtInGame: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  win: boolean;
  placement: number;
  playerSubteamId: number;
};

/** Team-level data including objectives and ban list for the match detail view. */
export type MatchTeam = {
  teamId: number;
  win: boolean;
  bans: number[];
  objectives: {
    baronKills: number;
    dragonKills: number;
    towerKills: number;
  };
};

/** Complete match detail containing all participants, teams, and game metadata. */
export type MatchDetail = {
  matchId: string;
  queueId: number;
  gameDurationSec: number;
  gameEndTimestamp: number;
  gameMode: string;
  gameVersion: string;
  teams: MatchTeam[];
  participants: MatchDetailParticipant[];
};

/** Valid tab IDs for the player dashboard — used by useTabNavigation hook and TabBar component. */
export type TabId = "overview" | "performance" | "champions" | "match-history";

/** Per-champion aggregated stats — returned by GET /api/trends/champions. */
export type ChampionStats = {
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  avgDamage: number;
  avgCs: number;
};

/** Single match data point for performance trend charts — returned by GET /api/trends/matches. */
export type MatchTrendPoint = {
  matchId: string;
  gameEndTimestamp: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  cs: number;
  championName: string;
  queueId: number;
};

/** Point-in-time LP snapshot for LP progression charts — returned by GET /api/trends/lp. */
export type LpSnapshot = {
  queueType: string;
  tier: string;
  rankDivision: string;
  leaguePoints: number;
  capturedAt: number;
};

/** A saved favorite player entry persisted in the user's profile. */
export type FavoritePlayer = {
  id: number;
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
  savedAt: string;
};
