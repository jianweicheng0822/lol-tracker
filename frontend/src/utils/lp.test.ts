import { describe, it, expect } from "vitest";
import { toAbsoluteLp } from "./lp";

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
