import type {
  Account,
  MatchSummary,
  PlayerStats,
  RankedEntry,
  ChampionStats,
  LpSnapshot,
  MatchTrendPoint,
  FavoritePlayer,
  MatchDetail,
  MatchDetailParticipant,
  MatchTeam,
} from "../types";

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    puuid: "test-puuid-123",
    gameName: "TestPlayer",
    tagLine: "NA1",
    profileIconId: 4567,
    ...overrides,
  };
}

export function makeMatchSummary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: "NA1_1234567890",
    championName: "Ahri",
    kills: 8,
    deaths: 3,
    assists: 12,
    win: true,
    gameDurationSec: 1845,
    gameEndTimestamp: Date.now() - 3600000,
    championLevel: 16,
    summoner1Id: 4,
    summoner2Id: 14,
    items: [3089, 3020, 3135, 3116, 3165, 3157, 3340],
    totalMinionsKilled: 180,
    neutralMinionsKilled: 20,
    queueId: 420,
    teamTotalKills: 30,
    allies: [
      { summonerName: "Ally1", championName: "Garen", puuid: "ally1" },
      { summonerName: "Ally2", championName: "Jinx", puuid: "ally2" },
      { summonerName: "Ally3", championName: "Thresh", puuid: "ally3" },
      { summonerName: "Ally4", championName: "LeeSin", puuid: "ally4" },
    ],
    enemies: [
      { summonerName: "Enemy1", championName: "Zed", puuid: "enemy1" },
      { summonerName: "Enemy2", championName: "MissFortune", puuid: "enemy2" },
      { summonerName: "Enemy3", championName: "Nautilus", puuid: "enemy3" },
      { summonerName: "Enemy4", championName: "Elise", puuid: "enemy4" },
      { summonerName: "Enemy5", championName: "Malphite", puuid: "enemy5" },
    ],
    primaryRuneId: 8005,
    secondaryRuneStyleId: 8200,
    augments: [],
    placement: 0,
    totalDamageDealtToChampions: 24000,
    goldEarned: 12500,
    ...overrides,
  };
}

export function makePlayerStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    totalGames: 20,
    wins: 12,
    losses: 8,
    winRate: 60,
    averageKills: 7.5,
    averageDeaths: 4.2,
    averageAssists: 8.3,
    averageKda: 3.76,
    ...overrides,
  };
}

export function makeRankedEntry(overrides: Partial<RankedEntry> = {}): RankedEntry {
  return {
    queueType: "RANKED_SOLO_5x5",
    tier: "GOLD",
    rank: "II",
    leaguePoints: 45,
    wins: 50,
    losses: 40,
    ...overrides,
  };
}

export function makeChampionStats(overrides: Partial<ChampionStats> = {}): ChampionStats {
  return {
    championName: "Ahri",
    games: 15,
    wins: 10,
    winRate: 66.7,
    avgKills: 7.2,
    avgDeaths: 3.1,
    avgAssists: 8.5,
    avgKda: 5.06,
    avgDamage: 22000,
    avgCs: 185,
    ...overrides,
  };
}

export function makeLpSnapshot(overrides: Partial<LpSnapshot> = {}): LpSnapshot {
  return {
    queueType: "RANKED_SOLO_5x5",
    tier: "GOLD",
    rankDivision: "II",
    leaguePoints: 45,
    capturedAt: Date.now() - 86400000,
    ...overrides,
  };
}

export function makeMatchTrendPoint(overrides: Partial<MatchTrendPoint> = {}): MatchTrendPoint {
  return {
    matchId: "NA1_1234567890",
    gameEndTimestamp: Date.now() - 3600000,
    win: true,
    kills: 8,
    deaths: 3,
    assists: 12,
    totalDamageDealtToChampions: 24000,
    goldEarned: 12500,
    cs: 200,
    championName: "Ahri",
    queueId: 420,
    ...overrides,
  };
}

export function makeFavoritePlayer(overrides: Partial<FavoritePlayer> = {}): FavoritePlayer {
  return {
    id: 1,
    puuid: "fav-puuid-1",
    gameName: "FavPlayer",
    tagLine: "NA1",
    region: "NA",
    savedAt: "2025-01-15T10:30:00Z",
    ...overrides,
  };
}

export function makeMatchDetailParticipant(
  overrides: Partial<MatchDetailParticipant> = {},
): MatchDetailParticipant {
  return {
    summonerName: "Player1",
    riotIdTagline: "NA1",
    championName: "Ahri",
    puuid: "p1-puuid",
    teamId: 100,
    kills: 8,
    deaths: 3,
    assists: 12,
    championLevel: 16,
    totalDamageDealtToChampions: 24000,
    totalDamageTaken: 18000,
    goldEarned: 12500,
    items: [3089, 3020, 3135, 3116, 3165, 3157, 3340],
    totalMinionsKilled: 180,
    neutralMinionsKilled: 20,
    summoner1Id: 4,
    summoner2Id: 14,
    primaryRuneId: 8005,
    secondaryRuneStyleId: 8200,
    wardsPlaced: 12,
    wardsKilled: 5,
    visionWardsBoughtInGame: 3,
    doubleKills: 1,
    tripleKills: 0,
    quadraKills: 0,
    pentaKills: 0,
    win: true,
    placement: 0,
    playerSubteamId: 0,
    ...overrides,
  };
}

export function makeMatchTeam(overrides: Partial<MatchTeam> = {}): MatchTeam {
  return {
    teamId: 100,
    win: true,
    bans: [238, 67, 412, 64, 54],
    objectives: {
      baronKills: 1,
      dragonKills: 3,
      towerKills: 8,
    },
    ...overrides,
  };
}

export function makeMatchDetail(overrides: Partial<MatchDetail> = {}): MatchDetail {
  return {
    matchId: "NA1_1234567890",
    queueId: 420,
    gameDurationSec: 1845,
    gameEndTimestamp: Date.now() - 3600000,
    gameMode: "CLASSIC",
    gameVersion: "15.1.1",
    teams: [
      makeMatchTeam({ teamId: 100, win: true }),
      makeMatchTeam({ teamId: 200, win: false }),
    ],
    participants: [
      makeMatchDetailParticipant({ puuid: "p1", teamId: 100, win: true, summonerName: "Player1" }),
      makeMatchDetailParticipant({ puuid: "p2", teamId: 100, win: true, summonerName: "Player2", championName: "Garen" }),
      makeMatchDetailParticipant({ puuid: "p3", teamId: 100, win: true, summonerName: "Player3", championName: "Jinx" }),
      makeMatchDetailParticipant({ puuid: "p4", teamId: 100, win: true, summonerName: "Player4", championName: "Thresh" }),
      makeMatchDetailParticipant({ puuid: "p5", teamId: 100, win: true, summonerName: "Player5", championName: "LeeSin" }),
      makeMatchDetailParticipant({ puuid: "p6", teamId: 200, win: false, summonerName: "Enemy1", championName: "Zed" }),
      makeMatchDetailParticipant({ puuid: "p7", teamId: 200, win: false, summonerName: "Enemy2", championName: "MissFortune" }),
      makeMatchDetailParticipant({ puuid: "p8", teamId: 200, win: false, summonerName: "Enemy3", championName: "Nautilus" }),
      makeMatchDetailParticipant({ puuid: "p9", teamId: 200, win: false, summonerName: "Enemy4", championName: "Elise" }),
      makeMatchDetailParticipant({ puuid: "p10", teamId: 200, win: false, summonerName: "Enemy5", championName: "Malphite" }),
    ],
    ...overrides,
  };
}
