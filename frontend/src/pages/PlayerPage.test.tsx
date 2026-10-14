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
  PlayerNotFoundError: class PlayerNotFoundError extends Error {},
}));

vi.mock("../utils/searchHistory", () => ({ addLocalEntry: vi.fn() }));
vi.mock("../components/SearchBar", () => ({ default: () => <div /> }));
vi.mock("../components/TabBar", () => ({ default: () => <div /> }));
vi.mock("../components/tabs/OverviewTab", () => ({ default: () => <div /> }));
vi.mock("../components/tabs/ChampionsTab", () => ({
  default: ({ refreshToken }: { refreshToken?: number }) => <div data-testid="champions-refresh">{refreshToken}</div>,
}));
vi.mock("../components/LiveGameCard", () => ({ default: () => <div /> }));
vi.mock("../components/Toast", () => ({
  default: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));
vi.mock("../components/ProfileHeader", () => ({
  default: ({ account, isFav, onToggleFavorite, onRefresh, isRefreshing }: {
    account: { gameName: string }; isFav: boolean; onToggleFavorite: () => void; onRefresh: () => void; isRefreshing?: boolean;
  }) => (
    <div>
      <span data-testid="header-name">{account.gameName}</span>
      <span data-testid="refreshing">{String(!!isRefreshing)}</span>
      <button onClick={onToggleFavorite}>{isFav ? "Favorited" : "Favorite"}</button>
      <button onClick={onRefresh}>Refresh</button>
    </div>
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

function renderPage(url = "/player/NA/Faker/KR1") {
  return render(
    <MemoryRouter initialEntries={[url]}>
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

describe("PlayerPage refresh", () => {
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
  });

  it("keeps the page on screen while refreshing, then shows the new data", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByTestId("header-name")).toHaveTextContent("Faker");

    let finishRefresh!: (value: typeof account) => void;
    vi.mocked(api.fetchAccount).mockReturnValueOnce(new Promise((resolve) => { finishRefresh = resolve; }));
    await user.click(screen.getByText("Refresh"));

    // No full-page loading state: the current data stays visible
    expect(screen.queryByText("Loading player data...")).not.toBeInTheDocument();
    expect(screen.getByTestId("header-name")).toHaveTextContent("Faker");
    expect(screen.getByTestId("refreshing")).toHaveTextContent("true");

    finishRefresh(makeAccount({ puuid: "puuid-1", gameName: "FakerRenamed", tagLine: "KR1" }));
    await waitFor(() => expect(screen.getByTestId("header-name")).toHaveTextContent("FakerRenamed"));
    expect(screen.getByTestId("refreshing")).toHaveTextContent("false");
  });

  it("keeps the previous data and shows a toast if a refresh fails", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByTestId("header-name")).toHaveTextContent("Faker");

    vi.mocked(api.fetchAccount).mockRejectedValueOnce(new Error("Network error"));
    await user.click(screen.getByText("Refresh"));

    expect(await screen.findByTestId("toast")).toHaveTextContent("Couldn't refresh");
    expect(screen.getByTestId("header-name")).toHaveTextContent("Faker");
    expect(screen.getByTestId("refreshing")).toHaveTextContent("false");
  });

  it("tells the Champions tab to refetch (keeping its filters) on refresh", async () => {
    const user = userEvent.setup();
    renderPage("/player/NA/Faker/KR1?tab=champions");
    expect(await screen.findByTestId("champions-refresh")).toHaveTextContent("0");

    await user.click(screen.getByText("Refresh"));

    // The tab stays on screen (no full-page loading state) and just gets a new token to refetch with
    expect(screen.getByTestId("champions-refresh")).toHaveTextContent("1");
  });
});

describe("PlayerPage errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAuthToken).mockReturnValue(null);
    vi.mocked(api.fetchTier).mockResolvedValue({ tier: 0 });
    vi.mocked(api.fetchMatchSummaries).mockResolvedValue([]);
    vi.mocked(api.fetchRanked).mockResolvedValue([]);
    vi.mocked(api.fetchLiveGame).mockResolvedValue(null);
    vi.mocked(api.fetchStats).mockResolvedValue({
      totalGames: 0, wins: 0, losses: 0, winRate: 0,
      averageKills: 0, averageDeaths: 0, averageAssists: 0, averageKda: 0,
    });
  });

  it("explains a not-found player and offers the other regions", async () => {
    vi.mocked(api.fetchAccount).mockRejectedValue(new api.PlayerNotFoundError("Riot account not found."));
    renderPage();

    const box = await screen.findByRole("status");
    expect(box).toHaveTextContent("No player named Faker#KR1 found in NA");
    const regionButtons = ["EUW", "KR", "JP", "BR", "OCE"];
    for (const r of regionButtons) expect(screen.getByRole("button", { name: r })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "NA" })).not.toBeInTheDocument();
  });

  it("searches the same Riot ID in another region with one click", async () => {
    vi.mocked(api.fetchAccount).mockRejectedValueOnce(new api.PlayerNotFoundError("Riot account not found."));
    vi.mocked(api.fetchAccount).mockResolvedValueOnce(account);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "KR" }));

    await waitFor(() => expect(api.fetchAccount).toHaveBeenLastCalledWith("Faker", "KR1", "KR"));
    expect(await screen.findByTestId("header-name")).toHaveTextContent("Faker");
  });

  it("shows other errors with a Retry button", async () => {
    vi.mocked(api.fetchAccount).mockRejectedValueOnce(new Error("Riot API rate limit exhausted."));
    vi.mocked(api.fetchAccount).mockResolvedValueOnce(account);
    const user = userEvent.setup();
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load this player. Riot API rate limit exhausted.");
    expect(screen.queryByText(/Try in:/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("header-name")).toHaveTextContent("Faker");
  });
});
