const BASE = "http://localhost:8080";

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

export async function fetchAccount(gameName: string, tag: string, region: string) {
  const res = await fetch(
    `${BASE}/api/summoner?gameName=${encodeURIComponent(gameName)}&tag=${encodeURIComponent(tag)}&region=${region}`
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchMatchSummaries(puuid: string, region: string, count = 10) {
  const res = await fetch(
    `${BASE}/api/matches/summary?puuid=${encodeURIComponent(puuid)}&region=${region}&count=${count}`
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchStats(puuid: string, region: string, count = 10) {
  const res = await fetch(
    `${BASE}/api/stats?puuid=${encodeURIComponent(puuid)}&region=${region}&count=${count}`
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchRanked(puuid: string, region: string) {
  const res = await fetch(
    `${BASE}/api/ranked?puuid=${encodeURIComponent(puuid)}&region=${region}`
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function fetchFavorites() {
  const res = await fetch(`${BASE}/api/favorites`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function checkIsFavorite(puuid: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/favorites/check/${puuid}`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.isFavorite;
}

export async function addFavorite(puuid: string, gameName: string, tagLine: string, region: string) {
  const res = await fetch(`${BASE}/api/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puuid, gameName, tagLine, region }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json();
}

export async function removeFavorite(puuid: string) {
  const res = await fetch(`${BASE}/api/favorites/${puuid}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}