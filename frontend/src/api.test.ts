import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setAuthToken, getAuthToken, login, register, readErrorMessage,
  fetchAccount, fetchAccountByPuuid, fetchMatchSummaries, fetchStats,
  fetchRanked, fetchMatchDetail, fetchFavorites, checkIsFavorite,
  addFavorite, removeFavorite, fetchChampionStats, fetchMatchTrends,
  fetchLpHistory, fetchTier, fetchLeaderboard,
} from "./api";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock import.meta.env
vi.stubGlobal("import.meta", { env: { DEV: true } });

describe("Token management", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  it("stores token in localStorage", () => {
    setAuthToken("my-jwt-token");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("lol_tracker_jwt", "my-jwt-token");
  });

  it("retrieves stored token", () => {
    store["lol_tracker_jwt"] = "stored-token";
    expect(getAuthToken()).toBe("stored-token");
  });

  it("removes token when set to null", () => {
    setAuthToken(null);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("lol_tracker_jwt");
  });

  it("returns null when no token is stored", () => {
    expect(getAuthToken()).toBeNull();
  });
});

describe("login", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  it("sends credentials and stores token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "jwt-123" }),
    });
    const result = await login("user1", "pass1");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "user1", password: "pass1" }),
      })
    );
    expect(result.token).toBe("jwt-123");
    expect(store["lol_tracker_jwt"]).toBe("jwt-123");
  });

  it("throws on failed login", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ message: "Bad credentials" }),
    });
    await expect(login("user1", "wrong")).rejects.toThrow("Bad credentials");
  });
});

describe("register", () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  it("sends registration and stores token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "jwt-new" }),
    });
    const result = await register("newuser", "newpass");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/register"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.token).toBe("jwt-new");
    expect(store["lol_tracker_jwt"]).toBe("jwt-new");
  });
});

describe("readErrorMessage", () => {
  it("parses JSON error with message field", async () => {
    const res = {
      status: 400,
      statusText: "Bad Request",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ message: "Username taken" }),
    } as unknown as Response;
    expect(await readErrorMessage(res)).toBe("Username taken");
  });

  it("parses JSON error with error field", async () => {
    const res = {
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Server failure" }),
    } as unknown as Response;
    expect(await readErrorMessage(res)).toBe("Server failure");
  });

  it("falls back to text for non-JSON responses", async () => {
    const res = {
      status: 403,
      statusText: "Forbidden",
      headers: new Headers({ "content-type": "text/plain" }),
      text: () => Promise.resolve("Access denied"),
    } as unknown as Response;
    expect(await readErrorMessage(res)).toBe("Access denied");
  });

  it("returns generic message on parse failure", async () => {
    const res = {
      status: 500,
      statusText: "Error",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.reject(new Error("parse error")),
    } as unknown as Response;
    expect(await readErrorMessage(res)).toBe("An unknown network error occurred.");
  });
});

function mockOk(data: unknown) {
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
}

function mockFail(message: string) {
  mockFetch.mockResolvedValue({
    ok: false, status: 404, statusText: "Not Found",
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve({ message }),
  });
}

describe("fetchAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls summoner endpoint with correct params", async () => {
    mockOk({ puuid: "p1", gameName: "Faker", tagLine: "KR1" });
    const result = await fetchAccount("Faker", "KR1", "KR");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/summoner?gameName=Faker&tag=KR1&region=KR"),
      expect.any(Object)
    );
    expect(result.puuid).toBe("p1");
  });

  it("throws on failure", async () => {
    mockFail("Not found");
    await expect(fetchAccount("x", "y", "NA")).rejects.toThrow("Not found");
  });
});

describe("fetchAccountByPuuid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls summoner by-puuid endpoint", async () => {
    mockOk({ puuid: "p1", gameName: "Faker" });
    await fetchAccountByPuuid("p1", "KR");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/summoner/by-puuid?puuid=p1&region=KR"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Not found");
    await expect(fetchAccountByPuuid("p1", "NA")).rejects.toThrow("Not found");
  });
});

describe("fetchMatchSummaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls summary endpoint with pagination", async () => {
    mockOk([]);
    await fetchMatchSummaries("p1", "NA", 20, 10);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/matches/summary?puuid=p1&region=NA&count=20&start=10"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchMatchSummaries("p1", "NA")).rejects.toThrow("Error");
  });
});

describe("fetchStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls stats endpoint", async () => {
    mockOk({ totalGames: 10 });
    const result = await fetchStats("p1", "NA", 20);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/stats?puuid=p1&region=NA&count=20"),
      expect.any(Object)
    );
    expect(result.totalGames).toBe(10);
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchStats("p1", "NA")).rejects.toThrow("Error");
  });
});

describe("fetchRanked", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls ranked endpoint", async () => {
    mockOk([{ queueType: "RANKED_SOLO_5x5" }]);
    await fetchRanked("p1", "NA");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ranked?puuid=p1&region=NA"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchRanked("p1", "NA")).rejects.toThrow("Error");
  });
});

describe("fetchMatchDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls full-detail endpoint", async () => {
    mockOk({ matchId: "NA1_1" });
    await fetchMatchDetail("NA1_1", "NA");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/matches/full-detail?matchId=NA1_1&region=NA"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchMatchDetail("NA1_1", "NA")).rejects.toThrow("Error");
  });
});

describe("fetchFavorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls favorites endpoint", async () => {
    mockOk([]);
    await fetchFavorites();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/favorites"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Unauthorized");
    await expect(fetchFavorites()).rejects.toThrow("Unauthorized");
  });
});

describe("checkIsFavorite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when favorited", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ isFavorite: true }) });
    expect(await checkIsFavorite("p1")).toBe(true);
  });

  it("returns false on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    expect(await checkIsFavorite("p1")).toBe(false);
  });
});

describe("addFavorite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts favorite data", async () => {
    mockOk({ id: 1 });
    await addFavorite("p1", "Faker", "KR1", "KR");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/favorites"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on failure", async () => {
    mockFail("Limit reached");
    await expect(addFavorite("p1", "Faker", "KR1", "KR")).rejects.toThrow("Limit reached");
  });
});

describe("removeFavorite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends delete request", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await removeFavorite("p1");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/favorites/p1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(removeFavorite("p1")).rejects.toThrow("Error");
  });
});

describe("fetchChampionStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls trends/champions with params", async () => {
    mockOk([]);
    await fetchChampionStats("p1", 20, 420);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/trends/champions?puuid=p1&count=20&queueId=420"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchChampionStats("p1")).rejects.toThrow("Error");
  });
});

describe("fetchMatchTrends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls trends/matches endpoint", async () => {
    mockOk([]);
    await fetchMatchTrends("p1");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/trends/matches?puuid=p1"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchMatchTrends("p1")).rejects.toThrow("Error");
  });
});

describe("fetchLpHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls trends/lp endpoint with default queue", async () => {
    mockOk([]);
    await fetchLpHistory("p1");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/trends/lp?puuid=p1&queueType=RANKED_SOLO_5x5"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchLpHistory("p1")).rejects.toThrow("Error");
  });
});

describe("fetchTier", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls tier endpoint", async () => {
    mockOk({ tier: 1 });
    const result = await fetchTier();
    expect(result.tier).toBe(1);
  });

  it("throws on failure", async () => {
    mockFail("Unauthorized");
    await expect(fetchTier()).rejects.toThrow("Unauthorized");
  });
});

describe("fetchLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls leaderboard endpoint with params", async () => {
    mockOk({ entries: [], totalEntries: 0 });
    await fetchLeaderboard("NA", "RANKED_SOLO_5x5", "challenger", 0, 50);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/leaderboard?region=NA&queue=RANKED_SOLO_5x5&tier=challenger&page=0&size=50"),
      expect.any(Object)
    );
  });

  it("throws on failure", async () => {
    mockFail("Error");
    await expect(fetchLeaderboard("NA", "RANKED_SOLO_5x5", "challenger")).rejects.toThrow("Error");
  });
});
