/** In dev, Vite sets MODE="development" → calls localhost:8080 directly.
 *  In production, the React build is served by Spring Boot on the same origin → empty base. */
const BASE = import.meta.env.DEV ? "http://localhost:8080" : "";

// --- JWT Token Management ---

const TOKEN_KEY = "lol_tracker_jwt";

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Default fetch options — includes JWT authorization header. */
function fetchOpts(extra?: RequestInit): RequestInit {
  return { ...extra, headers: { ...authHeaders(), ...(extra?.headers || {}) } };
}

// --- Auth API ---

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

// --- Error Handling ---

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

// --- Data API ---

export async function fetchAccount(gameName: string, tag: string, region: string) {
  const res = await fetch(
    `${BASE}/api/summoner?gameName=${encodeURIComponent(gameName)}&tag=${encodeURIComponent(tag)}&region=${region}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/** Fetches paginated match summaries. `start` is the offset index for pagination (e.g., 0, 10, 20...). */
export async function fetchMatchSummaries(puuid: string, region: string, count = 10, start = 0) {
  const res = await fetch(
    `${BASE}/api/matches/summary?puuid=${encodeURIComponent(puuid)}&region=${region}&count=${count}&start=${start}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchStats(puuid: string, region: string, count = 10) {
  const res = await fetch(
    `${BASE}/api/stats?puuid=${encodeURIComponent(puuid)}&region=${region}&count=${count}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchRanked(puuid: string, region: string) {
  const res = await fetch(
    `${BASE}/api/ranked?puuid=${encodeURIComponent(puuid)}&region=${region}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchMatchDetail(matchId: string, region: string) {
  const res = await fetch(
    `${BASE}/api/matches/full-detail?matchId=${encodeURIComponent(matchId)}&region=${region}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchFavorites() {
  const res = await fetch(`${BASE}/api/favorites`, fetchOpts());
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function checkIsFavorite(puuid: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/favorites/check/${puuid}`, fetchOpts());
  if (!res.ok) return false;
  const data = await res.json();
  return data.isFavorite;
}

export async function addFavorite(puuid: string, gameName: string, tagLine: string, region: string) {
  const res = await fetch(`${BASE}/api/favorites`, fetchOpts({
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ puuid, gameName, tagLine, region }),
  }));
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function removeFavorite(puuid: string) {
  const res = await fetch(`${BASE}/api/favorites/${puuid}`, fetchOpts({ method: "DELETE" }));
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

// --- Trend endpoints (from local database, not Riot API directly) ---

/** Fetches per-champion aggregated stats for the Champions tab grid. */
export async function fetchChampionStats(puuid: string) {
  const res = await fetch(
    `${BASE}/api/trends/champions?puuid=${encodeURIComponent(puuid)}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/** Fetches per-match trend data points for Performance tab charts (KDA, damage, win rate). */
export async function fetchMatchTrends(puuid: string) {
  const res = await fetch(
    `${BASE}/api/trends/matches?puuid=${encodeURIComponent(puuid)}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

/** Fetches LP progression history for the Performance tab LP chart. Defaults to Solo/Duo queue. */
export async function fetchLpHistory(puuid: string, queueType = "RANKED_SOLO_5x5") {
  const res = await fetch(
    `${BASE}/api/trends/lp?puuid=${encodeURIComponent(puuid)}&queueType=${encodeURIComponent(queueType)}`,
    fetchOpts()
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

// --- Subscription tier ---

export async function fetchTier(): Promise<{ tier: number }> {
  const res = await fetch(`${BASE}/api/tier`, fetchOpts());
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function upgradeTier(): Promise<{ tier: number }> {
  const res = await fetch(`${BASE}/api/upgrade`, fetchOpts());
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

// --- AI match analysis (streaming) ---
// Architecture: Frontend sends structured match data → Backend constructs prompt → OpenAI.
// The API key stays on the server; the frontend only receives streamed analysis tokens.

/** Structured match data sent to the backend for AI analysis (no prompt text — backend builds it). */
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

/** Single message in the conversation history (role: "user" or "assistant"). */
export type AiChatMessage = { role: string; content: string };

/**
 * Streams AI match analysis from the backend SSE endpoint.
 * Reads the response body incrementally and calls `onToken` for each content chunk,
 * enabling real-time rendering in the chat modal. Returns the full accumulated response.
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
    // SSE format: each event is "data:<content>" separated by newlines
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
