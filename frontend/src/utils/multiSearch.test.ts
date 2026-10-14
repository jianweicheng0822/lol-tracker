import { describe, it, expect } from "vitest";
import { parseMultiSearchInput } from "./multiSearch";

describe("parseMultiSearchInput", () => {
  it("splits on commas and newlines and ignores blank entries", () => {
    expect(parseMultiSearchInput("Faker#KR1,\n\n  Doublelift#NA1 ,").names).toEqual(["Faker#KR1", "Doublelift#NA1"]);
  });

  it("keeps valid IDs and reports malformed ones separately", () => {
    const result = parseMultiSearchInput("Faker#KR1\nnotagplayer\n#onlytag\nnoname#\nA#B#C\nCaps#EUW");
    expect(result.names).toEqual(["Faker#KR1", "Caps#EUW"]);
    expect(result.invalid).toEqual(["notagplayer", "#onlytag", "noname#", "A#B#C"]);
  });

  it("keeps spaces inside names but trims around the #", () => {
    expect(parseMultiSearchInput("EDG Viper # NA11").names).toEqual(["EDG Viper#NA11"]);
  });

  it("drops duplicates regardless of case", () => {
    expect(parseMultiSearchInput("Faker#KR1, faker#kr1, FAKER#KR1").names).toEqual(["Faker#KR1"]);
  });

  it("searches at most 5 and reports the rest as over the limit", () => {
    const result = parseMultiSearchInput("A#1,B#2,C#3,D#4,E#5,F#6,G#7");
    expect(result.names).toEqual(["A#1", "B#2", "C#3", "D#4", "E#5"]);
    expect(result.overLimit).toEqual(["F#6", "G#7"]);
  });

  it("doesn't let malformed lines use up the 5 slots", () => {
    const result = parseMultiSearchInput("bad1,bad2,A#1,B#2,C#3,D#4,E#5");
    expect(result.names).toHaveLength(5);
    expect(result.overLimit).toEqual([]);
  });
});
