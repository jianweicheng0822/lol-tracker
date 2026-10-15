import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { setAuthToken, usernameFromToken, TOKEN_KEY } from "../api";

/** Unsigned JWT with the given payload; only the payload matters for display. */
function fakeToken(payload: object): string {
  const b64url = (s: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify(payload))}.signature`;
}

describe("usernameFromToken", () => {
  it("reads the sub claim", () => {
    expect(usernameFromToken(fakeToken({ sub: "JIANWEICHENG" }))).toBe("JIANWEICHENG");
  });

  it("handles non-ASCII usernames", () => {
    expect(usernameFromToken(fakeToken({ sub: "화산신룡" }))).toBe("화산신룡");
  });

  it("returns null for unreadable tokens", () => {
    expect(usernameFromToken("not-a-jwt")).toBeNull();
    expect(usernameFromToken("a.%%%.c")).toBeNull();
    expect(usernameFromToken(fakeToken({ other: 1 }))).toBeNull();
  });
});

describe("useAuth", () => {
  beforeEach(() => localStorage.clear());

  it("reflects the stored token on first render", () => {
    localStorage.setItem(TOKEN_KEY, fakeToken({ sub: "Faker" }));
    const { result } = renderHook(() => useAuth());
    expect(result.current).toEqual({ isLoggedIn: true, username: "Faker" });
  });

  it("updates when the token changes in this tab", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);

    act(() => setAuthToken(fakeToken({ sub: "Faker" })));
    expect(result.current).toEqual({ isLoggedIn: true, username: "Faker" });

    act(() => setAuthToken(null));
    expect(result.current).toEqual({ isLoggedIn: false, username: null });
  });

  it("updates when another tab logs in or out", () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      localStorage.setItem(TOKEN_KEY, fakeToken({ sub: "Caps" }));
      window.dispatchEvent(new StorageEvent("storage", { key: TOKEN_KEY }));
    });
    expect(result.current.username).toBe("Caps");
  });
});
