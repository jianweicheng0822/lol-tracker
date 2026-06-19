import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./HomePage";
import * as api from "../api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api", () => ({
  fetchFavorites: vi.fn(),
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
}));

vi.mock("../components/SearchBar", () => ({
  default: () => <div data-testid="search-bar">SearchBar</div>,
}));

vi.mock("../components/AuthModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("../components/FavoritesList", () => ({
  default: ({ favorites }: { favorites: unknown[] }) => (
    <div data-testid="favorites-list">{favorites.length} favorites</div>
  ),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchFavorites).mockResolvedValue([]);
    vi.mocked(api.getAuthToken).mockReturnValue(null);
  });

  it("renders the title and subtitle", () => {
    render(<HomePage />);
    expect(screen.getByText("LoL Tracker")).toBeInTheDocument();
    expect(screen.getByText("Track LP progression, analyze match history, and discover champion trends.")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    render(<HomePage />);
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("renders demo player buttons", () => {
    render(<HomePage />);
    expect(screen.getByText("duoking1 #freex")).toBeInTheDocument();
    expect(screen.getByText("EDG Viper #NA11")).toBeInTheDocument();
  });

  it("shows Log in button when not authenticated", () => {
    render(<HomePage />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
  });

  it("shows Log out button when authenticated", () => {
    vi.mocked(api.getAuthToken).mockReturnValue("some-token");
    render(<HomePage />);
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("loads favorites on mount", () => {
    render(<HomePage />);
    expect(api.fetchFavorites).toHaveBeenCalled();
  });

  it("renders favorites list component", () => {
    render(<HomePage />);
    expect(screen.getByTestId("favorites-list")).toBeInTheDocument();
  });
});
