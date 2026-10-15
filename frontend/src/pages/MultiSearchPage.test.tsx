import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import MultiSearchPage from "./MultiSearchPage";
import * as api from "../api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

/** Shows the current query string so tests can check what was written to the URL. */
function LocationProbe() {
  return <div data-testid="location">{useLocation().search}</div>;
}

function renderPage(url = "/multi-search") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <MultiSearchPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}
// The header has its own tests
vi.mock("../components/AppHeader", () => ({
  default: () => <header data-testid="app-header" />,
}));

vi.mock("../api", () => ({
  fetchMultiSearch: vi.fn(),
}));

const MOCK_RESULTS = [
  {
    gameName: "Player1",
    tagLine: "NA1",
    puuid: "puuid-1",
    profileIconId: 100,
    rankedEntries: [
      { queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 45, wins: 50, losses: 40 },
    ],
    error: null,
  },
  {
    gameName: "Player2",
    tagLine: "EUW",
    puuid: "puuid-2",
    profileIconId: 200,
    rankedEntries: [],
    error: null,
  },
];

describe("MultiSearchPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the search form", () => {
    renderPage();
    expect(screen.getByText("Multi-Search")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("shows an error when no line is a valid Name#Tag", async () => {
    renderPage();
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "PlayerNoTag");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText(/no valid riot ids/i)).toBeInTheDocument();
    expect(api.fetchMultiSearch).not.toHaveBeenCalled();
  });

  it("searches the valid names and lists malformed lines instead of blocking", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    renderPage();
    await user.type(screen.getByRole("textbox"), "Player1#NA1, notagplayer, Player2#EUW");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(api.fetchMultiSearch).toHaveBeenCalledWith(["Player1#NA1", "Player2#EUW"], "NA");
    await waitFor(() => expect(screen.getByText("Player1")).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Skipped, not in Name#Tag format: notagplayer");
  });

  it("searches the first 5 players and says which were skipped", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    renderPage();
    await user.type(screen.getByRole("textbox"), "A#1,B#2,C#3,D#4,E#5,F#6");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(api.fetchMultiSearch).toHaveBeenCalledWith(["A#1", "B#2", "C#3", "D#4", "E#5"], "NA");
    expect(screen.getByRole("status")).toHaveTextContent("Only the first 5 players are searched. Skipped: F#6");
  });

  it("renders results after search", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    renderPage();

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Player1#NA1,Player2#EUW");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Player1")).toBeInTheDocument();
      expect(screen.getByText("Player2")).toBeInTheDocument();
    });
  });

  it("shows loading state during search", async () => {
    vi.mocked(api.fetchMultiSearch).mockReturnValue(new Promise(() => {}));
    renderPage();

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Player1#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("shows error on API failure", async () => {
    vi.mocked(api.fetchMultiSearch).mockRejectedValue(new Error("Network error"));
    renderPage();

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Player1#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("navigates to player page when card is clicked", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    renderPage();

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Player1#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Player1")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Player1"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Player1/NA1");
  });

  // --- Search kept in the URL, so Back / refresh / shared links restore it ---

  it("writes the searched names and region to the URL", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    renderPage();
    await user.type(screen.getByRole("textbox"), "Player1#NA1, notag, Player2#EUW");
    await user.click(screen.getByRole("button", { name: "Search" }));

    const params = new URLSearchParams(screen.getByTestId("location").textContent ?? "");
    // Only the names that were actually searched go in the URL
    expect(params.get("q")).toBe("Player1#NA1,Player2#EUW");
    expect(params.get("region")).toBe("NA");
  });

  it("restores and re-runs the search when opened with one in the URL", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    renderPage("/multi-search?q=" + encodeURIComponent("Player1#NA1,Player2#EUW") + "&region=EUW");

    expect(screen.getByRole("textbox")).toHaveValue("Player1#NA1\nPlayer2#EUW");
    expect(screen.getByRole("combobox")).toHaveValue("EUW");
    await waitFor(() => expect(screen.getByText("Player1")).toBeInTheDocument());
    expect(api.fetchMultiSearch).toHaveBeenCalledTimes(1);
    expect(api.fetchMultiSearch).toHaveBeenCalledWith(["Player1#NA1", "Player2#EUW"], "EUW");
  });

  it("falls back to NA for an unknown region in the URL", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    renderPage("/multi-search?q=" + encodeURIComponent("Player1#NA1") + "&region=MOON");

    expect(screen.getByRole("combobox")).toHaveValue("NA");
    await waitFor(() => expect(api.fetchMultiSearch).toHaveBeenCalledWith(["Player1#NA1"], "NA"));
  });

  it("doesn't search on open when the URL has no query", () => {
    renderPage();
    expect(api.fetchMultiSearch).not.toHaveBeenCalled();
  });
});
