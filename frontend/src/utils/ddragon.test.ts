import { describe, it, expect, vi } from "vitest";
import {
  ddragonBase,
  keystoneIconUrl,
  loadKeystoneRunes,
  runeStyleIconUrl,
  championIconUrl,
  itemIconUrl,
  spellIconUrl,
  formatDuration,
  timeAgo,
  KEYSTONE_ICONS,
  RUNE_STYLE_ICONS,
  SUMMONER_SPELLS,
  QUEUE_NAMES,
  queueLabel,
  isArenaQueue,
  isRankedQueue,
  isCommunityDragonUrl,
} from "./ddragon";

describe("ddragonBase", () => {
  it("returns versioned CDN URL", () => {
    expect(ddragonBase("15.1.1")).toBe(
      "https://ddragon.leagueoflegends.com/cdn/15.1.1/img"
    );
  });
});

describe("keystoneIconUrl", () => {
  it("returns correct URL for known keystone", () => {
    const url = keystoneIconUrl(8112);
    expect(url).toContain("Electrocute");
    expect(url).toContain("https://ddragon.leagueoflegends.com/cdn/img/perk-images/");
  });

  it("returns empty string for unknown keystone", () => {
    expect(keystoneIconUrl(9999)).toBe("");
  });

  it("builds a valid URL from dynamically loaded runesReforged data", async () => {
    // Shape of the real DDragon response: icon paths include a "perk-images/" prefix
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([
        { id: 8100, slots: [{ runes: [{ id: 8112, icon: "perk-images/Styles/Domination/Electrocute/Electrocute.png" }] }] },
      ]),
    }) as unknown as typeof fetch;
    try {
      const dynamicMap = await loadKeystoneRunes("test-dynamic-1");
      expect(keystoneIconUrl(8112, dynamicMap)).toBe(
        "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Electrocute/Electrocute.png"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("has entries for all rune trees", () => {
    // Precision
    expect(KEYSTONE_ICONS[8005]).toBeDefined();
    // Domination
    expect(KEYSTONE_ICONS[8112]).toBeDefined();
    // Sorcery
    expect(KEYSTONE_ICONS[8214]).toBeDefined();
    // Resolve
    expect(KEYSTONE_ICONS[8437]).toBeDefined();
    // Inspiration
    expect(KEYSTONE_ICONS[8351]).toBeDefined();
  });
});

describe("runeStyleIconUrl", () => {
  it("returns correct URL for known style", () => {
    const url = runeStyleIconUrl(8000);
    expect(url).toContain("Precision");
  });

  it("returns empty string for unknown style", () => {
    expect(runeStyleIconUrl(0)).toBe("");
  });

  it("covers all standard rune styles", () => {
    expect(RUNE_STYLE_ICONS[8000]).toBeDefined();
    expect(RUNE_STYLE_ICONS[8100]).toBeDefined();
    expect(RUNE_STYLE_ICONS[8200]).toBeDefined();
    expect(RUNE_STYLE_ICONS[8300]).toBeDefined();
    expect(RUNE_STYLE_ICONS[8400]).toBeDefined();
  });
});

describe("championIconUrl", () => {
  it("returns champion icon path", () => {
    const base = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img";
    expect(championIconUrl("Ahri", base)).toBe(`${base}/champion/Ahri.png`);
  });
});

describe("itemIconUrl", () => {
  it("returns item icon path", () => {
    const base = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img";
    expect(itemIconUrl(3089, base)).toBe(`${base}/item/3089.png`);
  });
});

describe("spellIconUrl", () => {
  it("returns correct spell icon for known ID", () => {
    const base = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img";
    expect(spellIconUrl(4, base)).toBe(`${base}/spell/SummonerFlash.png`);
    expect(spellIconUrl(14, base)).toBe(`${base}/spell/SummonerDot.png`);
  });

  it("falls back to SummonerFlash for unknown spell", () => {
    const base = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img";
    expect(spellIconUrl(9999, base)).toBe(`${base}/spell/SummonerFlash.png`);
  });

  it("covers common summoner spells", () => {
    expect(SUMMONER_SPELLS[4]).toBe("SummonerFlash");
    expect(SUMMONER_SPELLS[14]).toBe("SummonerDot");
    expect(SUMMONER_SPELLS[11]).toBe("SummonerSmite");
    expect(SUMMONER_SPELLS[12]).toBe("SummonerTeleport");
  });
});

describe("QUEUE_NAMES", () => {
  it("maps standard queue IDs", () => {
    expect(QUEUE_NAMES[420]).toBe("Ranked Solo/Duo");
    expect(QUEUE_NAMES[440]).toBe("Ranked Flex");
    expect(QUEUE_NAMES[450]).toBe("ARAM");
    expect(QUEUE_NAMES[1700]).toBe("Arena");
    expect(QUEUE_NAMES[1750]).toBe("Arena");
  });
});

describe("queueLabel", () => {
  it("returns the mapped name, or Other for unknown queues", () => {
    expect(queueLabel(420)).toBe("Ranked Solo/Duo");
    expect(queueLabel(9999)).toBe("Other");
  });
});

describe("isArenaQueue", () => {
  it("recognizes both the original and current Arena queue IDs", () => {
    expect(isArenaQueue(1700)).toBe(true);
    expect(isArenaQueue(1750)).toBe(true);
    expect(isArenaQueue(420)).toBe(false);
  });
});

describe("isRankedQueue", () => {
  it("is true only for Ranked Solo/Duo and Ranked Flex", () => {
    expect(isRankedQueue(420)).toBe(true);
    expect(isRankedQueue(440)).toBe(true);
    expect(isRankedQueue(450)).toBe(false);
    expect(isRankedQueue(1750)).toBe(false);
  });
});

describe("formatDuration", () => {
  it("formats seconds into minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0m 00s");
    expect(formatDuration(61)).toBe("1m 01s");
    expect(formatDuration(1800)).toBe("30m 00s");
    expect(formatDuration(125)).toBe("2m 05s");
  });
});

describe("timeAgo", () => {
  it("returns minutes ago for recent timestamps", () => {
    const fiveMinAgo = Date.now() - 5 * 60000;
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago for timestamps within a day", () => {
    const threeHoursAgo = Date.now() - 3 * 3600000;
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago for older timestamps", () => {
    const twoDaysAgo = Date.now() - 2 * 86400000;
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("still counts days up to a week", () => {
    expect(timeAgo(Date.now() - 6 * 86400000)).toBe("6d ago");
  });

  it("shows the date for games a week or more old", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 12));
    expect(timeAgo(new Date(2026, 4, 20, 12).getTime())).toBe("May 20");
    expect(timeAgo(new Date(2025, 11, 3, 12).getTime())).toBe("Dec 3, 2025");
    vi.useRealTimers();
  });
});

describe("isCommunityDragonUrl", () => {
  it("matches the CommunityDragon host only, not a lookalike", () => {
    expect(isCommunityDragonUrl("https://raw.communitydragon.org/latest/x.png")).toBe(true);
    expect(isCommunityDragonUrl("https://ddragon.leagueoflegends.com/cdn/img/x.png")).toBe(false);
    expect(isCommunityDragonUrl("https://evil.example/raw.communitydragon.org/x.png")).toBe(false);
    expect(isCommunityDragonUrl("not a url")).toBe(false);
  });
});
