import { describe, it, expect } from "vitest";
import { toAbsoluteLp, tierIconUrl, lpAxis, formatRank, timeTicks, startedDay } from "./lp";

describe("toAbsoluteLp", () => {
  it("converts Iron IV 0 LP to 0", () => {
    expect(toAbsoluteLp("IRON", "IV", 0)).toBe(0);
  });

  it("converts Iron III 0 LP to 100", () => {
    expect(toAbsoluteLp("IRON", "III", 0)).toBe(100);
  });

  it("converts Bronze IV 0 LP to 400", () => {
    expect(toAbsoluteLp("BRONZE", "IV", 0)).toBe(400);
  });

  it("converts Gold II 45 LP to 1445", () => {
    expect(toAbsoluteLp("GOLD", "II", 45)).toBe(1200 + 200 + 45);
  });

  it("converts Diamond I 75 LP to 2775", () => {
    expect(toAbsoluteLp("DIAMOND", "I", 75)).toBe(2400 + 300 + 75);
  });

  it("converts Master LP directly (no division offset)", () => {
    expect(toAbsoluteLp("MASTER", "", 150)).toBe(2800 + 150);
  });

  it("converts Grandmaster LP directly", () => {
    expect(toAbsoluteLp("GRANDMASTER", "", 500)).toBe(2800 + 500);
  });

  it("converts Challenger LP directly", () => {
    expect(toAbsoluteLp("CHALLENGER", "", 1200)).toBe(2800 + 1200);
  });

  it("is case-insensitive for tier", () => {
    expect(toAbsoluteLp("gold", "II", 50)).toBe(1200 + 200 + 50);
  });

  it("handles every tier at IV 0 LP", () => {
    const tiers = [
      ["IRON", 0],
      ["BRONZE", 400],
      ["SILVER", 800],
      ["GOLD", 1200],
      ["PLATINUM", 1600],
      ["EMERALD", 2000],
      ["DIAMOND", 2400],
    ] as const;
    for (const [tier, expected] of tiers) {
      expect(toAbsoluteLp(tier, "IV", 0)).toBe(expected);
    }
  });
});

describe("tierIconUrl", () => {
  it("points at the ranked crest, SVG for Emerald", () => {
    expect(tierIconUrl("DIAMOND")).toMatch(/ranked-mini-crests\/diamond\.png$/);
    expect(tierIconUrl("EMERALD")).toMatch(/ranked-mini-crests\/emerald\.svg$/);
  });
});

describe("lpAxis", () => {
  it("counts LP for Master and above", () => {
    const { ticks, format } = lpAxis([2800 + 1200, 2800 + 1610]);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(format(2800 + 1500)).toBe("1,500 LP");
  });

  it("marks divisions below Master", () => {
    // Gold II 40 LP to Gold I 80 LP
    const { domain, ticks, format } = lpAxis([1200 + 200 + 40, 1200 + 300 + 80]);
    expect(domain[0]).toBeLessThanOrEqual(1440);
    expect(domain[1]).toBeGreaterThanOrEqual(1580);
    expect(ticks.map(format)).toContain("Gold I");
  });

  it("marks only tiers when the range is wide", () => {
    const { ticks, format } = lpAxis([400, 2000]);
    expect(ticks.every((t) => t % 400 === 0)).toBe(true);
    expect(ticks.map(format)).toContain("Gold");
  });
});

describe("formatRank", () => {
  it("drops the division for apex tiers", () => {
    expect(formatRank("DIAMOND", "II")).toBe("Diamond II");
    expect(formatRank("GRANDMASTER", "I")).toBe("Grandmaster");
  });
});

describe("timeTicks", () => {
  it("spreads ticks evenly from start to end", () => {
    expect(timeTicks(0, 100)).toEqual([0, 25, 50, 75, 100]);
    expect(timeTicks(5, 5)).toEqual([5]);
  });
});

describe("lpAxis apex fit", () => {
  it("fits closely around the data", () => {
    const { domain, ticks } = lpAxis([2800 + 3256, 2800 + 4058]);
    expect(domain[0]).toBeGreaterThan(2800 + 3100);
    expect(domain[1]).toBeLessThan(2800 + 4200);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(5);
  });
});

describe("lpAxis apex ticks", () => {
  it("lands on round LP numbers", () => {
    const { ticks, format } = lpAxis([2800 + 3256, 2800 + 4058]);
    expect(ticks.map(format)).toEqual(["3,250 LP", "3,500 LP", "3,750 LP", "4,000 LP"]);
  });
});

describe("startedDay", () => {
  it("says today or yesterday for recent starts, the date for older ones", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 15));
    expect(startedDay(new Date(2026, 9, 17, 1).getTime())).toBe("today");
    expect(startedDay(new Date(2026, 9, 16, 23).getTime())).toBe("yesterday");
    expect(startedDay(new Date(2026, 8, 17, 12).getTime())).toBe("on Sep 17");
    vi.useRealTimers();
  });
});
