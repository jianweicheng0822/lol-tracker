import type { Page, Route } from "@playwright/test";
import {
  makeAccount,
  makeFavoritePlayer,
  makeMatchDetail,
  makeMatchSummary,
  makePlayerStats,
  makeRankedEntry,
} from "../src/test/fixtures";
import type { FavoritePlayer, LeaderboardEntry } from "../src/types";

export const PLAYER = makeAccount({ puuid: "faker-puuid", gameName: "Faker", tagLine: "KR1" });
export const OTHER_PLAYER = makeAccount({ puuid: "caps-puuid", gameName: "Caps", tagLine: "EUW" });

const MATCHES = Array.from({ length: 5 }, (_, i) =>
  makeMatchSummary({ matchId: `NA1_10${i}`, win: i % 2 === 0, gameEndTimestamp: Date.now() - (i + 1) * 3_600_000 }),
);

/** 120 challengers, so the leaderboard has several pages. */
const LEADERBOARD: LeaderboardEntry[] = Array.from({ length: 120 }, (_, i) => ({
  summonerName: `Ladder${i + 1}#NA${i + 1}`,
  puuid: `ladder-${i + 1}`,
  tier: "CHALLENGER",
  rank: "I",
  leaguePoints: 2000 - i * 10,
  wins: 200,
  losses: 150,
  winRate: 57.1,
}));

type Options = {
  /** Favorites returned to a logged-in user. */
  favorites?: FavoritePlayer[];
};

/**
 * Serve every /api request from fixtures, and block everything outside the app (Riot's CDNs,
 * analytics) so tests never depend on the network. The app has fallbacks for missing images and
 * game data, which is exactly what these tests then run with.
 */
export async function mockApi(page: Page, { favorites = [] }: Options = {}) {
  let favs = [...favorites];

  await page.route((url) => url.hostname !== "localhost", (route) => route.abort());

  await page.route("**/api/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    const accountFor = (name: string | null) => (name === OTHER_PLAYER.gameName ? OTHER_PLAYER : PLAYER);

    switch (url.pathname) {
      case "/api/summoner":
        if (url.searchParams.get("gameName") === "Nobody") return json({ message: "Player not found" }, 404);
        return json(accountFor(url.searchParams.get("gameName")));
      case "/api/summoner/by-puuid":
        return json(url.searchParams.get("puuid") === OTHER_PLAYER.puuid ? OTHER_PLAYER : PLAYER);
      case "/api/matches/summary":
        return json(url.searchParams.get("start") === "0" ? MATCHES : []);
      case "/api/matches/full-detail":
        return json(makeMatchDetail({ matchId: url.searchParams.get("matchId") ?? "NA1_100" }));
      case "/api/stats":
        return json(makePlayerStats());
      case "/api/ranked":
        return json([makeRankedEntry({ tier: "DIAMOND", rank: "II" })]);
      case "/api/live-game":
        return json(null);
      case "/api/tier":
        return json({ tier: 0 });
      case "/api/trends/lp":
      case "/api/trends/champions":
      case "/api/trends/matches":
      case "/api/search-history":
        return json([]);
      case "/api/oauth2/providers":
        return json({ google: false, discord: false });
      case "/api/leaderboard": {
        const page = Number(url.searchParams.get("page") ?? 0);
        const size = Number(url.searchParams.get("size") ?? 25);
        return json({ entries: LEADERBOARD.slice(page * size, page * size + size), totalEntries: LEADERBOARD.length });
      }
      case "/api/favorites":
        return json(favs);
    }

    if (url.pathname.startsWith("/api/favorites/check/")) {
      const puuid = decodeURIComponent(url.pathname.split("/").pop()!);
      return json({ isFavorite: favs.some((f) => f.puuid === puuid) });
    }
    if (url.pathname.startsWith("/api/favorites/") && method === "DELETE") {
      const puuid = decodeURIComponent(url.pathname.split("/").pop()!);
      favs = favs.filter((f) => f.puuid !== puuid);
      return json({ message: "Removed from favorites" });
    }

    // Anything new shows up as a failed request rather than hanging the test
    return json({ message: `Not mocked in e2e: ${method} ${url.pathname}` }, 500);
  });
}

/** Log in without the login form: the app only needs a token in localStorage. */
export async function logIn(page: Page) {
  // Unsigned token with a "sub" claim, which is all the frontend reads (the mocked API ignores it)
  const payload = Buffer.from(JSON.stringify({ sub: "e2e-user" })).toString("base64url");
  await page.addInitScript((token) => localStorage.setItem("lol_tracker_jwt", token), `e2e.${payload}.sig`);
}

export { makeFavoritePlayer };
