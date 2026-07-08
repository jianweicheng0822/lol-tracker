import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MultiSearchPage from "./MultiSearchPage";
import * as api from "../api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
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
    render(<MultiSearchPage />);
    expect(screen.getByText("Multi-Search")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("validates missing # in name", async () => {
    render(<MultiSearchPage />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "PlayerNoTag");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText(/missing #/i)).toBeInTheDocument();
  });

  it("validates more than 5 players", async () => {
    render(<MultiSearchPage />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "A#1,B#2,C#3,D#4,E#5,F#6");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText(/maximum 5 players/i)).toBeInTheDocument();
  });

  it("renders results after search", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    render(<MultiSearchPage />);

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
    render(<MultiSearchPage />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Player1#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("shows error on API failure", async () => {
    vi.mocked(api.fetchMultiSearch).mockRejectedValue(new Error("Network error"));
    render(<MultiSearchPage />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Player1#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("navigates to player page when card is clicked", async () => {
    vi.mocked(api.fetchMultiSearch).mockResolvedValue(MOCK_RESULTS);
    render(<MultiSearchPage />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Player1#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Player1")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Player1"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Player1/NA1");
  });
});
