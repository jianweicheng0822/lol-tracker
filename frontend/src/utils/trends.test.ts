import { describe, it, expect } from "vitest";
import { movingAverage, rollingWinRate } from "./trends";

describe("movingAverage", () => {
  it("returns nulls for positions before window is full", () => {
    const result = movingAverage([2, 4, 6, 8, 10], 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  it("computes correct averages once window is full", () => {
    const result = movingAverage([2, 4, 6, 8, 10], 3);
    expect(result).toEqual([null, null, 4, 6, 8]);
  });

  it("handles window of 1 (no nulls)", () => {
    const result = movingAverage([5, 10, 15], 1);
    expect(result).toEqual([5, 10, 15]);
  });

  it("handles window equal to data length", () => {
    const result = movingAverage([2, 4, 6], 3);
    expect(result).toEqual([null, null, 4]);
  });

  it("returns empty array for empty input", () => {
    expect(movingAverage([], 3)).toEqual([]);
  });
});

describe("rollingWinRate", () => {
  it("returns nulls for positions before window is full", () => {
    const result = rollingWinRate([true, false, true, true, false], 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  it("computes correct win rates", () => {
    const result = rollingWinRate([true, false, true, true, false], 3);
    // Window 3: [t,f,t]=67%, [f,t,t]=67%, [t,t,f]=67%
    expect(result).toEqual([null, null, 67, 67, 67]);
  });

  it("returns 100 for all wins", () => {
    const result = rollingWinRate([true, true, true], 2);
    expect(result).toEqual([null, 100, 100]);
  });

  it("returns 0 for all losses", () => {
    const result = rollingWinRate([false, false, false], 2);
    expect(result).toEqual([null, 0, 0]);
  });

  it("returns empty array for empty input", () => {
    expect(rollingWinRate([], 3)).toEqual([]);
  });
});
