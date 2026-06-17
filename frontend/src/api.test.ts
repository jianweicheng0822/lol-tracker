import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAuthToken, getAuthToken, login, register, readErrorMessage } from "./api";

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
