import { render, screen } from "@testing-library/react";
import RankSummary from "./RankSummary";
import { makeRankedEntry } from "../../test/fixtures";

vi.mock("../../utils/ddragon", () => ({
  hideOnError: vi.fn(),
}));

describe("RankSummary", () => {
  it("shows Unranked when entries is empty", () => {
    render(<RankSummary entries={[]} />);
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("shows Unranked when no relevant queue types", () => {
    render(<RankSummary entries={[makeRankedEntry({ queueType: "CHERRY" })]} />);
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("renders Solo/Duo badge for RANKED_SOLO_5x5", () => {
    render(<RankSummary entries={[makeRankedEntry()]} />);
    expect(screen.getByText("Solo/Duo")).toBeInTheDocument();
    expect(screen.getByText("Gold II")).toBeInTheDocument();
    expect(screen.getByText("45 LP")).toBeInTheDocument();
  });

  it("renders Flex badge for RANKED_FLEX_SR", () => {
    render(<RankSummary entries={[makeRankedEntry({ queueType: "RANKED_FLEX_SR" })]} />);
    expect(screen.getByText("Flex")).toBeInTheDocument();
  });

  it("hides rank division for apex tiers", () => {
    render(<RankSummary entries={[makeRankedEntry({ tier: "MASTER", rank: "I", leaguePoints: 200 })]} />);
    expect(screen.getByText("Master")).toBeInTheDocument();
    expect(screen.queryByText("Master I")).not.toBeInTheDocument();
  });

  it("sorts Solo/Duo before Flex", () => {
    const entries = [
      makeRankedEntry({ queueType: "RANKED_FLEX_SR", tier: "SILVER", rank: "IV" }),
      makeRankedEntry({ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II" }),
    ];
    render(<RankSummary entries={entries} />);
    const labels = screen.getAllByText(/Solo\/Duo|Flex/);
    expect(labels[0]).toHaveTextContent("Solo/Duo");
    expect(labels[1]).toHaveTextContent("Flex");
  });

  it("calculates and displays win rate", () => {
    render(<RankSummary entries={[makeRankedEntry({ wins: 60, losses: 40 })]} />);
    expect(screen.getByText(/60W 40L/)).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders tier icon with correct src and 56px size", () => {
    render(<RankSummary entries={[makeRankedEntry({ tier: "DIAMOND" })]} />);
    const img = screen.getByAltText("DIAMOND") as HTMLImageElement;
    expect(img.src).toContain("diamond.png");
    expect(img.style.width).toBe("56px");
    expect(img.style.height).toBe("56px");
  });

  it("renders tier name at 20px font-weight 800", () => {
    render(<RankSummary entries={[makeRankedEntry()]} />);
    const tierEl = screen.getByText("Gold II");
    expect(tierEl).toHaveStyle({ fontSize: "20px", fontWeight: "800" });
  });

  it("renders LP at 16px", () => {
    render(<RankSummary entries={[makeRankedEntry()]} />);
    const lp = screen.getByText("45 LP");
    expect(lp).toHaveStyle({ fontSize: "16px" });
  });

  it("color-codes win rate green for >=55%", () => {
    render(<RankSummary entries={[makeRankedEntry({ wins: 60, losses: 40 })]} />);
    expect(screen.getByText("60%")).toHaveStyle({ color: "#3a9e72" });
  });

  it("color-codes win rate red for <45%", () => {
    render(<RankSummary entries={[makeRankedEntry({ wins: 30, losses: 70 })]} />);
    expect(screen.getByText("30%")).toHaveStyle({ color: "#d06060" });
  });
});
