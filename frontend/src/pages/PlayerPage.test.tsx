import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PlayerPage from "./PlayerPage";
import * as api from "../api";
import { makeAccount } from "../test/fixtures";

vi.mock("../api", () => ({
  fetchAccount: vi.fn(),
  fetchAccountByPuuid: vi.fn(),
  fetchMatchSummaries: vi.fn(),
  fetchStats: vi.fn(),
  fetchRanked: vi.fn(),
  checkIsFavorite: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  fetchTier: vi.fn(),
  fetchLiveGame: vi.fn(),
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  addSearchHistory: vi.fn(),
  AuthRequiredError: class AuthRequiredError extends Error {},
}));

vi.mock("../utils/searchHistory", () => ({ addLocalEntry: vi.fn() }));
vi.mock("../components/SearchBar", () => ({ default: () => <div /> }));
vi.mock("../components/TabBar", () => ({ default: () => <div /> }));
vi.mock("../components/tabs/OverviewTab", () => ({ default: () => <div /> }));
vi.mock("../components/tabs/ChampionsTab", () => ({ default: () => <div /> }));
vi.mock("../components/LiveGameCard", () => ({ default: () => <div /> }));
vi.mock("../components/Toast", () => ({
  default: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));
vi.mock("../components/ProfileHeader", () => ({
  default: ({ isFav, onToggleFavorite }: { isFav: boolean; onToggleFavorite: () => void }) => (
    <button onClick={onToggleFavorite}>{isFav ? "Favorited" : "Favorite"}</button>
  ),
}));
// Mirrors the real AuthModal: onSuccess() is not awaited and onClose() runs immediately after
vi.mock("../components/AuthModal", () => ({
  default: ({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) => (
    <div data-testid="auth-modal">
      <button
        onClick={() => {
          vi.mocked(api.getAuthToken).mockReturnValue("token");
          onSuccess();
          onClose();
        }}
      >
        Submit login
      </button>
      <button onClick={onClose}>Dismiss</button>
    </div>
  ),
}));

const account = makeAccount({ puuid: "puuid-1", gameName: "Faker", tagLine: "KR1" });

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/player/NA/Faker/KR1"]}>
      <Routes>
        <Route path="/player/:region/:gameName/:tag" element={<PlayerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PlayerPage favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAuthToken).mockReturnValue(null);
    vi.mocked(api.fetchAccount).mockResolvedValue(account);
    vi.mocked(api.fetchTier).mockResolvedValue({ tier: 0 });
    vi.mocked(api.fetchMatchSummaries).mockResolvedValue([]);
    vi.mocked(api.fetchRanked).mockResolvedValue([]);
    vi.mocked(api.fetchLiveGame).mockResolvedValue(null);
    vi.mocked(api.fetchStats).mockResolvedValue({
      totalGames: 0, wins: 0, losses: 0, winRate: 0,
      averageKills: 0, averageDeaths: 0, averageAssists: 0, averageKda: 0,
    });
    vi.mocked(api.checkIsFavorite).mockResolvedValue(false);
    vi.mocked(api.addFavorite).mockResolvedValue({});
  });

  it("does not check favorite status when logged out", async () => {
    renderPage();
    await screen.findByText("Favorite");
    expect(api.checkIsFavorite).not.toHaveBeenCalled();
  });

  it("prompts login instead of failing silently when logged out", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Favorite"));

    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
    expect(screen.getByTestId("toast")).toHaveTextContent("Log in to save favorites");
    expect(api.addFavorite).not.toHaveBeenCalled();
  });

  it("completes the favorite after logging in", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Favorite"));
    await user.click(screen.getByText("Submit login"));

    await waitFor(() => expect(api.addFavorite).toHaveBeenCalledWith("puuid-1", "Faker", "KR1", "NA"));
    expect(await screen.findByText("Favorited")).toBeInTheDocument();
    expect(screen.getByTestId("toast")).toHaveTextContent("Added to favorites");
  });

  it("does not add a favorite if the login prompt was dismissed", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Favorite"));
    await user.click(screen.getByText("Dismiss"));

    // Logging in later from the header should not add the earlier favorite
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.click(screen.getByText("Submit login"));
    await waitFor(() => expect(api.fetchTier).toHaveBeenCalledTimes(2));
    expect(api.addFavorite).not.toHaveBeenCalled();
  });

  it("shows an error toast when adding a favorite fails", async () => {
    vi.mocked(api.getAuthToken).mockReturnValue("token");
    vi.mocked(api.addFavorite).mockRejectedValue(new Error("Server error"));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Favorite"));

    expect(await screen.findByTestId("toast")).toHaveTextContent("Couldn't add favorite");
    expect(screen.getByText("Favorite")).toBeInTheDocument();
  });

  it("clears an expired session and prompts login on 401", async () => {
    vi.mocked(api.getAuthToken).mockReturnValue("expired-token");
    vi.mocked(api.addFavorite).mockRejectedValue(new api.AuthRequiredError("Authentication required"));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Favorite"));

    expect(api.setAuthToken).toHaveBeenCalledWith(null);
    expect(await screen.findByTestId("auth-modal")).toBeInTheDocument();
  });
});
