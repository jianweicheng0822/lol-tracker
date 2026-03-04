/** Shared TypeScript types matching the backend DTOs. */

// --- Region ---
export type Region = "NA" | "EUW" | "KR" | "JP" | "BR" | "OCE";

export const REGIONS: Region[] = ["NA", "EUW", "KR", "JP", "BR", "OCE"];

// --- Account ---
export type Account = {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
};

// --- Match history ---
export type MatchParticipant = {
  summonerName: string;
  riotIdTagline?: string; // Tag portion of Riot ID (e.g., "NA1") — used for clickable player links
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
  augments: number[]; // Arena augment IDs (4 slots)
  placement: number; // Arena placement (1–8); 0 for non-Arena modes
  totalDamageDealtToChampions: number;
  goldEarned: number;
};

// --- Player stats ---
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

// --- Ranked ---
export type RankedEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

// --- Match detail (full scoreboard) ---
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
  placement: number; // Arena placement (1–8); 0 for non-Arena modes
  playerSubteamId: number; // Arena duo-team ID — groups two players together
};

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

// --- Dashboard tabs ---
/** Valid tab IDs for the player dashboard — used by useTabNavigation hook and TabBar component. */
export type TabId = "overview" | "performance" | "champions" | "match-history";

// --- Trend / stats types (from /api/trends endpoints) ---

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

// --- Favorites ---
export type FavoritePlayer = {
  id: number;
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
  savedAt: string;
};