import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import LeaderboardPage from "./LeaderboardPage";
import * as api from "../api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

/** Shows the current query string so tests can check what the page wrote to the URL. */
function LocationProbe() {
  return <div data-testid="location">{useLocation().search}</div>;
}

function renderPage(url = "/leaderboard") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <LeaderboardPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

vi.mock("../api", () => ({
  fetchLeaderboard: vi.fn(),
}));

const MOCK_ENTRIES = [
  { summonerName: "Faker", puuid: "puuid-faker", tier: "CHALLENGER", rank: "I", leaguePoints: 1500, wins: 200, losses: 80, winRate: 71.4, profileIconId: 4567 },
  { summonerName: "Zeus", puuid: "puuid-zeus", tier: "CHALLENGER", rank: "I", leaguePoints: 1200, wins: 180, losses: 90, winRate: 66.7, profileIconId: 1234 },
  { summonerName: "Gumayusi", puuid: "puuid-guma", tier: "CHALLENGER", rank: "I", leaguePoints: 1000, wins: 150, losses: 100, winRate: 60.0, profileIconId: 0 },
];

const MOCK_RESPONSE = { entries: MOCK_ENTRIES, totalEntries: 3 };

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchLeaderboard).mockResolvedValue(MOCK_RESPONSE);
  });

  it("shows loading state initially", () => {
    vi.mocked(api.fetchLeaderboard).mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    const skeletons = container.querySelectorAll("div[style*='animation']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(api.fetchLeaderboard).mockRejectedValue(new Error("Network error"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("renders leaderboard entries after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });
    expect(screen.getByText("Zeus")).toBeInTheDocument();
    expect(screen.getByText("Gumayusi")).toBeInTheDocument();
  });

  it("displays LP values", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("1,500 LP")).toBeInTheDocument();
    });
    expect(screen.getByText("1,200 LP")).toBeInTheDocument();
    expect(screen.getByText("1,000 LP")).toBeInTheDocument();
  });

  it("displays win rate values", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("71.4%")).toBeInTheDocument();
    });
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("displays win/loss records", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("200W 80L")).toBeInTheDocument();
    });
  });

  it("displays rank numbers", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("fetches challenger NA page 0 by default", () => {
    renderPage();
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "challenger", 0, 25);
  });

  it("refetches when tier tab is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Grandmaster"));
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "grandmaster", 0, 25);
  });

  it("offers only the NA, EUW, and KR leaderboards", async () => {
    renderPage();
    const select = await screen.findByDisplayValue("NA");
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toEqual(["NA", "EUW", "KR"]);
  });

  it("refetches when region is changed", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue("NA");
    await user.selectOptions(select, "KR");
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("KR", "RANKED_SOLO_5x5", "challenger", 0, 25);
  });

  it("refetches when queue is changed to Flex", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue("Solo/Duo");
    await user.selectOptions(select, "RANKED_FLEX_SR");
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_FLEX_SR", "challenger", 0, 25);
  });

  it("navigates home when back button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText(/Home/));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders the page title", () => {
    vi.mocked(api.fetchLeaderboard).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
  });

  it("renders all three tier tabs", () => {
    vi.mocked(api.fetchLeaderboard).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Challenger")).toBeInTheDocument();
    expect(screen.getByText("Grandmaster")).toBeInTheDocument();
    expect(screen.getByText("Master")).toBeInTheDocument();
  });

  it("renders table headers", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText("LP")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("W / L")).toBeInTheDocument();
  });

  it("shows no entries message for empty result", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: [], totalEntries: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No entries found.")).toBeInTheDocument();
    });
  });

  it("shows pagination when multiple pages exist", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: MOCK_ENTRIES, totalEntries: 120 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument(); // 120 entries, 25 per page
    expect(screen.getByText(/Prev/)).toBeDisabled();
    expect(screen.getByText(/Next/)).not.toBeDisabled();
  });

  it("navigates to player page when row is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Faker"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/puuid/NA/puuid-faker");
  });

  it("renders each player's profile icon, with the default icon when it's missing", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    const srcs = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="profileicon"]')).map((i) => i.src);
    // Faker (4567) and Zeus (1234) have icons; Gumayusi (0) gets the default icon (29)
    expect(srcs).toHaveLength(3);
    expect(srcs.some((s) => s.endsWith("/profileicon/4567.png"))).toBe(true);
    expect(srcs.some((s) => s.endsWith("/profileicon/1234.png"))).toBe(true);
    expect(srcs.some((s) => s.endsWith("/profileicon/29.png"))).toBe(true);
  });

  it("shows the default profile icon instead of a blank placeholder when profileIconId is 0", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({
      entries: [{ summonerName: "NoIcon", puuid: "puuid-noicon", tier: "CHALLENGER", rank: "I", leaguePoints: 500, wins: 50, losses: 50, winRate: 50.0, profileIconId: 0 }],
      totalEntries: 1,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("NoIcon")).toBeInTheDocument();
    });

    const icon = document.querySelector<HTMLImageElement>('img[src*="profileicon"]');
    expect(icon?.src).toMatch(/\/profileicon\/29\.png$/);
  });

  it("falls back to the default icon when a profile icon fails to load", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    const fakerIcon = document.querySelector<HTMLImageElement>('img[src$="/profileicon/4567.png"]')!;
    fireEvent.error(fakerIcon);
    expect(fakerIcon.src).toMatch(/\/profileicon\/29\.png$/);
    // Still visible, so the row stays aligned
    expect(fakerIcon.style.display).not.toBe("none");
  });

  it("advances to next page when Next is clicked", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: MOCK_ENTRIES, totalEntries: 120 });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Faker")).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Next/));
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "challenger", 1, 25);
  });

  it("retries the same view after an error", async () => {
    vi.mocked(api.fetchLeaderboard).mockRejectedValueOnce(new Error("Server unavailable"));
    const user = userEvent.setup();
    renderPage("/leaderboard?region=KR&tier=grandmaster");
    expect(await screen.findByText(/Server unavailable/)).toBeInTheDocument();

    await user.click(screen.getByText("Retry"));

    await waitFor(() => expect(screen.getByText("Faker")).toBeInTheDocument());
    expect(api.fetchLeaderboard).toHaveBeenCalledTimes(2);
    expect(api.fetchLeaderboard).toHaveBeenLastCalledWith("KR", "RANKED_SOLO_5x5", "grandmaster", 0, 25);
  });

  // --- View kept in the URL, so links can be shared and refresh/Back keep it ---

  const currentParams = () => new URLSearchParams(screen.getByTestId("location").textContent ?? "");

  it("keeps the default view at a plain /leaderboard URL", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Faker")).toBeInTheDocument());
    expect(screen.getByTestId("location")).toHaveTextContent(/^$/);
  });

  it("writes filter and page changes to the URL", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: MOCK_ENTRIES, totalEntries: 120 });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Faker")).toBeInTheDocument());

    await user.selectOptions(screen.getByDisplayValue("NA"), "KR");
    await user.click(screen.getByText("Grandmaster"));
    await waitFor(() => expect(screen.getByText("Faker")).toBeInTheDocument());
    await user.click(screen.getByText(/Next/));

    const params = currentParams();
    expect(params.get("region")).toBe("KR");
    expect(params.get("tier")).toBe("grandmaster");
    expect(params.get("page")).toBe("2"); // 1-based in the URL
    expect(params.get("queue")).toBeNull(); // still the default
  });

  it("opens the view described by the URL", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: MOCK_ENTRIES, totalEntries: 120 });
    renderPage("/leaderboard?region=EUW&queue=RANKED_FLEX_SR&tier=master&page=3");

    expect(api.fetchLeaderboard).toHaveBeenCalledWith("EUW", "RANKED_FLEX_SR", "master", 2, 25);
    expect(screen.getByDisplayValue("EUW")).toBeInTheDocument();
    expect(await screen.findByText("Page 3 of 5")).toBeInTheDocument();
  });

  it("falls back to defaults for invalid values in the URL", () => {
    renderPage("/leaderboard?region=JP&queue=ARAM&tier=iron&page=abc");
    expect(api.fetchLeaderboard).toHaveBeenCalledWith("NA", "RANKED_SOLO_5x5", "challenger", 0, 25);
  });

  it("goes back to page 1 when a filter changes", async () => {
    vi.mocked(api.fetchLeaderboard).mockResolvedValue({ entries: MOCK_ENTRIES, totalEntries: 120 });
    const user = userEvent.setup();
    renderPage("/leaderboard?page=3");
    await waitFor(() => expect(screen.getByText("Faker")).toBeInTheDocument());

    await user.click(screen.getByText("Master"));

    expect(currentParams().get("page")).toBeNull();
    expect(api.fetchLeaderboard).toHaveBeenLastCalledWith("NA", "RANKED_SOLO_5x5", "master", 0, 25);
  });
});
