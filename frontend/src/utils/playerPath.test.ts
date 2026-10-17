import { playerPath } from "./playerPath";

describe("playerPath", () => {
  it("uses the readable Riot ID form when name and tag are known", () => {
    expect(playerPath("NA", "duoking1#freex", "p1")).toBe("/player/NA/duoking1/freex");
  });

  it("accepts the spaced label form and encodes the name", () => {
    expect(playerPath("NA", "C9 Loki #kr3", "p1")).toBe("/player/NA/C9%20Loki/kr3");
  });

  it("splits on the last # so the tag never contains one", () => {
    expect(playerPath("EUW", "a#b#EUW", "p1")).toBe("/player/EUW/a%23b/EUW");
  });

  it("falls back to the PUUID form without a full Riot ID", () => {
    expect(playerPath("KR", "Faker", "p 1")).toBe("/player/puuid/KR/p%201");
    expect(playerPath("KR", "Faker#", "p1")).toBe("/player/puuid/KR/p1");
    expect(playerPath("KR", "#KR1", "p1")).toBe("/player/puuid/KR/p1");
    expect(playerPath("KR", undefined, "p1")).toBe("/player/puuid/KR/p1");
  });
});
