/**
 * @file api.ts
 * @description Centralized HTTP client for all backend API calls including authentication,
 *   Riot API data fetching, favorites management, trend endpoints, and AI match analysis streaming.
 * @module frontend.api
 */

/**
 * Base URL for API requests. In development Vite proxies to localhost:8080;
 * in production the React build is served by Spring Boot on the same origin.
 */
const BASE = import.meta.env.DEV ? "http://localhost:8080" : "";

const TOKEN_KEY = "lol_tracker_jwt";

/**
 * Persist or clear the JWT authentication token in local storage.
 *
 * @param token - The JWT string to store, or null to remove the token.
 */
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Retrieve the stored JWT authentication token.
 *
 * @returns The JWT string if present, otherwise null.
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Build an Authorization header object from the stored JWT token.
 *
 * @returns A record containing the Bearer token header, or an empty object if unauthenticated.
 */
function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Merge default fetch options (including JWT authorization) with caller-provided overrides.
 *
 * @param extra - Additional RequestInit options to merge.
 * @returns Combined RequestInit with authorization headers applied.
 */
function fetchOpts(extra?: RequestInit): RequestInit {
  return { ...extra, headers: { ...authHeaders(), ...(extra?.headers || {}) } };
}

/**
 * Authenticate a user and store the returned JWT token.
 *
 * @param username - The user's login name.
 * @param password - The user's password.
 * @returns The authentication response containing the JWT token.
 */
export async function login(username: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const data = await res.json();
  setAuthToken(data.token);
  return data;
}

/**
 * Register a new user account and store the returned JWT token.
 *
 * @param username - The desired login name.
 * @param password - The desired password.
 * @returns The registration response containing the JWT token.
 */
export async function register(username: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const data = await res.json();
  setAuthToken(data.token);
  return data;
}

/**
 * Extract a human-readable error message from a failed HTTP response.
 *
 * @param res - The failed Response object.
 * @returns A descriptive error string parsed from the response body.
 */
export async function readErrorMessage(res: Response): Promise<string> {
  try {
    const type = res.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      const body = await res.json();
      return body?.message || body?.error || `Error ${res.status}: ${res.statusText}`;
    }
    return (await res.text()) || `Status ${res.status}`;
  } catch {
    return "An unknown network error occurred.";
  }
}

/**
 * Fetch a summoner account by Riot ID (game name + tag) and region.
 *
 * @param gameName - The summoner's game name portion of their Riot ID.
 * @param tag - The tag portion of the Riot ID (e.g., "NA1").
 * @param region - The Riot API region code (e.g., "NA", "EUW").
 * @returns The resolved account object including PUUID and profile icon.
 */
export async function fetchAccount(gameName: string, tag: string, region: string) {
  const res = await fetch(
    `${BASE}/api/summoner?gameName=${encodeURIComponent(gameName)}&tag=${encodeURIComponent(tag)}&region=${region}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch paginated match summaries for a player.
 *
 * @param puuid - The player's PUUID from the Riot API.
 * @param region - The Riot API region code.
 * @param count - Number of matches to retrieve per page.
 * @param start - The offset index for pagination (e.g., 0, 10, 20...).
 * @returns An array of match summary objects.
 */
export async function fetchMatchSummaries(puuid: string, region: string, count = 10, start = 0) {
  const res = await fetch(
    `${BASE}/api/matches/summary?puuid=${encodeURIComponent(puuid)}&region=${region}&count=${count}&start=${start}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch aggregated player statistics over recent matches.
 *
 * @param puuid - The player's PUUID.
 * @param region - The Riot API region code.
 * @param count - Number of recent matches to include in the aggregation.
 * @returns Aggregated stats including win rate, average KDA, etc.
 */
export async function fetchStats(puuid: string, region: string, count = 10) {
  const res = await fetch(
    `${BASE}/api/stats?puuid=${encodeURIComponent(puuid)}&region=${region}&count=${count}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch ranked queue entries (Solo/Duo, Flex) for a player.
 *
 * @param puuid - The player's PUUID.
 * @param region - The Riot API region code.
 * @returns An array of ranked entry objects with tier, rank, and LP.
 */
export async function fetchRanked(puuid: string, region: string) {
  const res = await fetch(
    `${BASE}/api/ranked?puuid=${encodeURIComponent(puuid)}&region=${region}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch the full match detail including all participants and team objectives.
 *
 * @param matchId - The unique Riot match identifier (e.g., "NA1_1234567890").
 * @param region - The Riot API region code.
 * @returns The complete match detail with participant stats and team data.
 */
export async function fetchMatchDetail(matchId: string, region: string) {
  const res = await fetch(
    `${BASE}/api/matches/full-detail?matchId=${encodeURIComponent(matchId)}&region=${region}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch the authenticated user's list of favorite players.
 *
 * @returns An array of saved favorite player objects.
 */
export async function fetchFavorites() {
  const res = await fetch(`${BASE}/api/favorites`, fetchOpts());
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Check whether a player is in the current user's favorites list.
 *
 * @param puuid - The PUUID of the player to check.
 * @returns True if the player is favorited, false otherwise.
 */
export async function checkIsFavorite(puuid: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/favorites/check/${puuid}`, fetchOpts());
  if (!res.ok) return false;
  const data = await res.json();
  return data.isFavorite;
}

/**
 * Add a player to the authenticated user's favorites list.
 *
 * @param puuid - The player's PUUID.
 * @param gameName - The player's game name.
 * @param tagLine - The player's Riot ID tag.
 * @param region - The Riot API region code.
 * @returns The created favorite entry.
 */
export async function addFavorite(puuid: string, gameName: string, tagLine: string, region: string) {
  const res = await fetch(`${BASE}/api/favorites`, fetchOpts({
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ puuid, gameName, tagLine, region }),
  }));
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Remove a player from the authenticated user's favorites list.
 *
 * @param puuid - The PUUID of the player to remove.
 */
export async function removeFavorite(puuid: string) {
  const res = await fetch(`${BASE}/api/favorites/${puuid}`, fetchOpts({ method: "DELETE" }));
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

/**
 * Fetch per-champion aggregated stats from the local database for the Champions tab grid.
 *
 * @param puuid - The player's PUUID.
 * @returns An array of per-champion stat objects.
 */
export async function fetchChampionStats(puuid: string) {
  const res = await fetch(
    `${BASE}/api/trends/champions?puuid=${encodeURIComponent(puuid)}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch per-match trend data points for Performance tab charts (KDA, damage, win rate).
 *
 * @param puuid - The player's PUUID.
 * @returns An array of match trend point objects ordered chronologically.
 */
export async function fetchMatchTrends(puuid: string) {
  const res = await fetch(
    `${BASE}/api/trends/matches?puuid=${encodeURIComponent(puuid)}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch LP progression history for the Performance tab LP chart.
 *
 * @param puuid - The player's PUUID.
 * @param queueType - The ranked queue type identifier (defaults to Solo/Duo).
 * @returns An array of LP snapshot objects ordered chronologically.
 */
export async function fetchLpHistory(puuid: string, queueType = "RANKED_SOLO_5x5") {
  const res = await fetch(
    `${BASE}/api/trends/lp?puuid=${encodeURIComponent(puuid)}&queueType=${encodeURIComponent(queueType)}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Fetch the current user's subscription tier level.
 *
 * @returns An object containing the numeric tier value.
 */
export async function fetchTier(): Promise<{ tier: number }> {
  const res = await fetch(`${BASE}/api/tier`, fetchOpts());
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Upgrade the current user's subscription tier.
 *
 * @returns An object containing the new numeric tier value.
 */
export async function upgradeTier(): Promise<{ tier: number }> {
  const res = await fetch(`${BASE}/api/upgrade`, fetchOpts());
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/**
 * Structured match data sent to the backend for AI analysis.
 * The backend constructs the LLM prompt from this data; no prompt text is sent from the frontend.
 */
export type AiMatchData = {
  champion: string;
  role: string;
  rank: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  visionScore: number;
  gameDurationSec: number;
  win: boolean;
  items: string[];
  teamComp: string[];
  enemyComp: string[];
};

/** Single message in the AI conversation history (role: "user" or "assistant"). */
export type AiChatMessage = { role: string; content: string };

/**
 * Stream AI match analysis from the backend SSE endpoint. Read the response body
 * incrementally and invoke `onToken` for each content chunk, enabling real-time
 * rendering in the chat modal.
 *
 * @param matchData - Structured match statistics for the AI to analyze.
 * @param messages - Conversation history enabling multi-turn follow-up questions.
 * @param onToken - Callback invoked with each streamed token for incremental UI updates.
 * @returns The full accumulated AI response string.
 */
export async function analyzeMatchStream(
  matchData: AiMatchData,
  messages: AiChatMessage[],
  onToken: (token: string) => void,
): Promise<string> {
  const res = await fetch(`${BASE}/api/analyze/stream`, fetchOpts({
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ matchData, messages }),
  }));

  if (!res.ok) throw new Error(await readErrorMessage(res));

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming not supported");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data:") continue;

      let content = trimmed.startsWith("data:") ? trimmed.slice(5) : trimmed;

      // Spring SSE may serialize Flux<String> values as JSON strings
      if (content.startsWith('"') && content.endsWith('"')) {
        try { content = JSON.parse(content); } catch { /* use as-is */ }
      }

      if (content) {
        full += content;
        onToken(content);
      }
    }
  }

  return full;
}
