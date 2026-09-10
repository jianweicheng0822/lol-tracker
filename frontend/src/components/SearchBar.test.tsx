import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "./SearchBar";
import type { SearchEntry } from "../utils/searchHistory";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockGetAuthToken = vi.fn((): string | null => null);
const mockFetchSearchHistory = vi.fn();
const mockRemoveSearchHistory = vi.fn();
const mockClearAllSearchHistory = vi.fn();

vi.mock("../api", () => ({
  getAuthToken: () => mockGetAuthToken(),
  fetchSearchHistory: (...args: unknown[]) => mockFetchSearchHistory(...args),
  removeSearchHistory: (...args: unknown[]) => mockRemoveSearchHistory(...args),
  clearAllSearchHistory: (...args: unknown[]) => mockClearAllSearchHistory(...args),
}));

const mockGetLocalHistory = vi.fn((): SearchEntry[] => []);
const mockRemoveLocalEntry = vi.fn();
const mockClearLocalHistory = vi.fn();

vi.mock("../utils/searchHistory", () => ({
  getLocalHistory: () => mockGetLocalHistory(),
  removeLocalEntry: (...args: unknown[]) => mockRemoveLocalEntry(...args),
  clearLocalHistory: (...args: unknown[]) => mockClearLocalHistory(...args),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetAuthToken.mockReturnValue(null);
    mockFetchSearchHistory.mockReset();
    mockRemoveSearchHistory.mockReset();
    mockClearAllSearchHistory.mockReset();
    mockGetLocalHistory.mockReturnValue([]);
    mockRemoveLocalEntry.mockReset();
    mockClearLocalHistory.mockReset();
  });

  it("renders region select, game name input, tag input, and search button", () => {
    render(<SearchBar />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Game Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("#Tag")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("disables search button when fields are empty", () => {
    render(<SearchBar />);
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("enables search button when both fields have values", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Faker");
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    expect(screen.getByRole("button", { name: "Search" })).toBeEnabled();
  });

  it("navigates to player page on button click", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Faker");
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Faker/KR1");
  });

  it("navigates on Enter key press", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Faker");
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    await user.keyboard("{Enter}");
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Faker/KR1");
  });

  it("strips leading # from tag", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Player");
    await user.type(screen.getByPlaceholderText("#Tag"), "#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Player/NA1");
  });

  it("does not navigate when game name is empty", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    await user.keyboard("{Enter}");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("pre-populates with initial values", () => {
    render(<SearchBar initialRegion="EUW" initialGameName="Test" initialTag="001" />);
    expect(screen.getByPlaceholderText("Game Name")).toHaveValue("Test");
    expect(screen.getByPlaceholderText("#Tag")).toHaveValue("001");
    expect(screen.getByRole("combobox")).toHaveValue("EUW");
  });

  // --- Search History tests ---

  it("shows history dropdown on game name focus (unauthenticated)", async () => {
    const user = userEvent.setup();
    mockGetLocalHistory.mockReturnValue([
      { region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 },
    ]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));

    await waitFor(() => {
      expect(screen.getByTestId("search-history-dropdown")).toBeInTheDocument();
    });
    expect(screen.getByText("Faker#KR1")).toBeInTheDocument();
    expect(screen.getByText("Recent Searches")).toBeInTheDocument();
  });

  it("filters history by gameName#tagLine prefix (case-insensitive)", async () => {
    const user = userEvent.setup();
    mockGetLocalHistory.mockReturnValue([
      { region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 2000 },
      { region: "NA", gameName: "Doublelift", tagLine: "NA1", searchedAt: 1000 },
    ]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));
    await waitFor(() => {
      expect(screen.getByTestId("search-history-dropdown")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Game Name"), "fak");
    await waitFor(() => {
      expect(screen.getByText("Faker#KR1")).toBeInTheDocument();
    });
    expect(screen.queryByText("Doublelift#NA1")).not.toBeInTheDocument();
  });

  it("navigates when clicking a history item", async () => {
    const user = userEvent.setup();
    mockGetLocalHistory.mockReturnValue([
      { region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 },
    ]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));
    await waitFor(() => {
      expect(screen.getByText("Faker#KR1")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Faker#KR1"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/KR/Faker/KR1");
  });

  it("removes an entry when clicking the × button (unauthenticated)", async () => {
    const user = userEvent.setup();
    mockGetLocalHistory
      .mockReturnValueOnce([
        { region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 },
      ])
      .mockReturnValue([]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));
    await waitFor(() => {
      expect(screen.getByTestId("search-history-dropdown")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Remove Faker#KR1"));
    expect(mockRemoveLocalEntry).toHaveBeenCalledWith("KR", "Faker", "KR1");
  });

  it("clears all history when clicking Clear All (unauthenticated)", async () => {
    const user = userEvent.setup();
    mockGetLocalHistory.mockReturnValue([
      { region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 },
    ]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));
    await waitFor(() => {
      expect(screen.getByTestId("search-history-dropdown")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Clear All"));
    expect(mockClearLocalHistory).toHaveBeenCalled();
  });

  it("closes dropdown on Escape", async () => {
    const user = userEvent.setup();
    mockGetLocalHistory.mockReturnValue([
      { region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: 1000 },
    ]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));
    await waitFor(() => {
      expect(screen.getByTestId("search-history-dropdown")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("search-history-dropdown")).not.toBeInTheDocument();
  });

  it("uses API when authenticated", async () => {
    const user = userEvent.setup();
    mockGetAuthToken.mockReturnValue("fake-token");
    mockFetchSearchHistory.mockResolvedValue([
      { region: "KR", gameName: "Faker", tagLine: "KR1", searchedAt: "2024-01-01T00:00:00Z" },
    ]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));

    await waitFor(() => {
      expect(mockFetchSearchHistory).toHaveBeenCalled();
    });
    expect(screen.getByText("Faker#KR1")).toBeInTheDocument();
  });

  it("uses localStorage when not authenticated", async () => {
    const user = userEvent.setup();
    mockGetAuthToken.mockReturnValue(null);
    mockGetLocalHistory.mockReturnValue([
      { region: "NA", gameName: "Test", tagLine: "001", searchedAt: 1000 },
    ]);

    render(<SearchBar />);
    await user.click(screen.getByPlaceholderText("Game Name"));

    await waitFor(() => {
      expect(mockGetLocalHistory).toHaveBeenCalled();
    });
    expect(screen.getByText("Test#001")).toBeInTheDocument();
  });
});
