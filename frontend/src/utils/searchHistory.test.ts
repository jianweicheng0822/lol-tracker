import { describe, it, expect, beforeEach } from "vitest";
import { getLocalHistory, addLocalEntry, removeLocalEntry, clearLocalHistory } from "./searchHistory";

describe("searchHistory localStorage utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no history exists", () => {
    expect(getLocalHistory()).toEqual([]);
  });

  it("adds and retrieves an entry", () => {
    addLocalEntry({ region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 });
    const history = getLocalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].gameName).toBe("Faker");
    expect(history[0].tagLine).toBe("KR1");
    expect(history[0].region).toBe("KR");
  });

  it("deduplicates by case-insensitive gameName+tagLine+region", () => {
    addLocalEntry({ region: "KR", gameName: "faker", tagLine: "kr1", searchedAt: 1000 });
    addLocalEntry({ region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 2000 });
    const history = getLocalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].gameName).toBe("Faker"); // canonical casing
    expect(history[0].searchedAt).toBe(2000); // updated timestamp
  });

  it("updates searchedAt and casing on duplicate search without creating new record", () => {
    addLocalEntry({ region: "NA", gameName: "doublelift", tagLine: "na1", searchedAt: 1000 });
    addLocalEntry({ region: "NA", gameName: "Doublelift", tagLine: "NA1", searchedAt: 3000 });
    const history = getLocalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].gameName).toBe("Doublelift");
    expect(history[0].tagLine).toBe("NA1");
    expect(history[0].searchedAt).toBe(3000);
  });

  it("keeps at most 10 entries, removing the oldest", () => {
    for (let i = 0; i < 12; i++) {
      addLocalEntry({ region: "NA", gameName: `Player${i}`, tagLine: `T${i}`, searchedAt: i * 1000 });
    }
    const history = getLocalHistory();
    expect(history).toHaveLength(10);
    // Oldest two (Player0, Player1) should be dropped
    expect(history.find((h) => h.gameName === "Player0")).toBeUndefined();
    expect(history.find((h) => h.gameName === "Player1")).toBeUndefined();
    expect(history[0].gameName).toBe("Player11"); // newest first
  });

  it("removes a single entry", () => {
    addLocalEntry({ region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 });
    addLocalEntry({ region: "NA", gameName: "Player2", tagLine: "NA1", searchedAt: 2000 });
    removeLocalEntry("KR", "Faker", "KR1");
    const history = getLocalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].gameName).toBe("Player2");
  });

  it("clears all history", () => {
    addLocalEntry({ region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 });
    addLocalEntry({ region: "NA", gameName: "Player2", tagLine: "NA1", searchedAt: 2000 });
    clearLocalHistory();
    expect(getLocalHistory()).toEqual([]);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("lol_tracker_search_history", "not-valid-json{{{");
    expect(getLocalHistory()).toEqual([]);
  });

  it("returns entries sorted by searchedAt descending", () => {
    addLocalEntry({ region: "NA", gameName: "A", tagLine: "1", searchedAt: 1000 });
    addLocalEntry({ region: "NA", gameName: "B", tagLine: "2", searchedAt: 3000 });
    addLocalEntry({ region: "NA", gameName: "C", tagLine: "3", searchedAt: 2000 });
    const history = getLocalHistory();
    expect(history[0].gameName).toBe("B");
    expect(history[1].gameName).toBe("C");
    expect(history[2].gameName).toBe("A");
  });
});
