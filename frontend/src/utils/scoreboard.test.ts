import { teamsWithPlayerFirst } from "./scoreboard";
import { makeMatchDetail } from "../test/fixtures";

describe("teamsWithPlayerFirst", () => {
  const match = makeMatchDetail(); // p1-p5 on team 100, p6-p10 on team 200

  it("puts the player's team first", () => {
    expect(teamsWithPlayerFirst(match, "p6").map((t) => t.teamId)).toEqual([200, 100]);
    expect(teamsWithPlayerFirst(match, "p1").map((t) => t.teamId)).toEqual([100, 200]);
  });

  it("keeps the original order when the player isn't in the match", () => {
    expect(teamsWithPlayerFirst(match, "someone-else").map((t) => t.teamId)).toEqual([100, 200]);
    expect(teamsWithPlayerFirst(match, undefined).map((t) => t.teamId)).toEqual([100, 200]);
  });
});
