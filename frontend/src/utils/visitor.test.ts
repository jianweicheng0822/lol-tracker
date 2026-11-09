import { describe, it, expect, beforeEach } from "vitest";
import { externalReferrer, getVisitorId, pageName } from "./visitor";

describe("getVisitorId", () => {
  beforeEach(() => localStorage.clear());

  it("creates an id once and keeps it", () => {
    const id = getVisitorId();
    expect(id).toMatch(/^[A-Za-z0-9-]{16,64}$/);
    expect(getVisitorId()).toBe(id);
    expect(localStorage.getItem("lol_tracker_vid")).toBe(id);
  });

  it("replaces a malformed stored id", () => {
    localStorage.setItem("lol_tracker_vid", "bad id");
    expect(getVisitorId()).not.toBe("bad id");
  });
});

describe("pageName", () => {
  it("names pages without player names or match ids", () => {
    expect(pageName("/")).toBe("home");
    expect(pageName("/player/NA/Faker/KR1")).toBe("player");
    expect(pageName("/match/NA/NA1_123")).toBe("match");
    expect(pageName("/live/EUW/Someone/EUW")).toBe("live");
    expect(pageName("/leaderboard")).toBe("leaderboard");
    expect(pageName("/multi-search")).toBe("multi_search");
    expect(pageName("/checkout/success")).toBe("checkout");
    expect(pageName("/nope")).toBe("not_found");
  });

  it("skips admin and OAuth pages", () => {
    expect(pageName("/admin/usage")).toBeNull();
    expect(pageName("/admin/feedback")).toBeNull();
    expect(pageName("/oauth-callback")).toBeNull();
  });
});

describe("externalReferrer", () => {
  it("returns other sites' hosts only", () => {
    expect(externalReferrer("https://www.reddit.com/r/leagueoflegends/", "loltracker.lol")).toBe("www.reddit.com");
    expect(externalReferrer("https://loltracker.lol/leaderboard", "loltracker.lol")).toBeNull();
    expect(externalReferrer("", "loltracker.lol")).toBeNull();
    expect(externalReferrer("not a url", "loltracker.lol")).toBeNull();
  });
});
