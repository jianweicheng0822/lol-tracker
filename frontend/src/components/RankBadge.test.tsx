import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RankBadge from "./RankBadge";
import type { RankedEntry } from "../types";

const soloEntry: RankedEntry = {
  queueType: "RANKED_SOLO_5x5",
  tier: "GOLD",
  rank: "II",
  leaguePoints: 45,
  wins: 60,
  losses: 40,
};

const flexEntry: RankedEntry = {
  queueType: "RANKED_FLEX_SR",
  tier: "SILVER",
  rank: "I",
  leaguePoints: 80,
  wins: 30,
  losses: 20,
};

describe("RankBadge", () => {
  it("shows Unranked when entries are empty", () => {
    render(<RankBadge entries={[]} />);
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("renders Solo/Duo badge with tier, LP, and record", () => {
    render(<RankBadge entries={[soloEntry]} />);
    expect(screen.getByText("Solo/Duo")).toBeInTheDocument();
    expect(screen.getByText("Gold II")).toBeInTheDocument();
    expect(screen.getByText("45 LP")).toBeInTheDocument();
    expect(screen.getByText(/60W 40L/)).toBeInTheDocument();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });

  it("renders both Solo and Flex badges", () => {
    render(<RankBadge entries={[soloEntry, flexEntry]} />);
    expect(screen.getByText("Solo/Duo")).toBeInTheDocument();
    expect(screen.getByText("Flex")).toBeInTheDocument();
  });

  it("omits division for apex tiers", () => {
    const masterEntry: RankedEntry = {
      queueType: "RANKED_SOLO_5x5",
      tier: "MASTER",
      rank: "I",
      leaguePoints: 200,
      wins: 100,
      losses: 50,
    };
    render(<RankBadge entries={[masterEntry]} />);
    expect(screen.getByText("Master")).toBeInTheDocument();
    // Should NOT show "Master I"
    expect(screen.queryByText("Master I")).not.toBeInTheDocument();
  });

  it("filters out irrelevant queue types", () => {
    const arenaEntry: RankedEntry = {
      queueType: "CHERRY",
      tier: "GOLD",
      rank: "I",
      leaguePoints: 50,
      wins: 10,
      losses: 5,
    };
    render(<RankBadge entries={[arenaEntry]} />);
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });
});
