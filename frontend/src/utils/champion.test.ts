import { describe, it, expect } from "vitest";
import { championDisplayName } from "./champion";

describe("championDisplayName", () => {
  it("uses the DDragon name when it's loaded", () => {
    const names = { MonkeyKing: "Wukong", KSante: "K'Sante", AurelionSol: "Aurelion Sol" };
    expect(championDisplayName("MonkeyKing", names)).toBe("Wukong");
    expect(championDisplayName("KSante", names)).toBe("K'Sante");
    expect(championDisplayName("AurelionSol", names)).toBe("Aurelion Sol");
  });

  it("splits the key on capital letters until the names load", () => {
    expect(championDisplayName("AurelionSol")).toBe("Aurelion Sol");
    expect(championDisplayName("MissFortune")).toBe("Miss Fortune");
    expect(championDisplayName("Neeko")).toBe("Neeko");
  });
});
