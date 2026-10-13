import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../components/SearchBar", () => ({
  default: () => <div data-testid="search-bar">SearchBar</div>,
}));

describe("NotFoundPage", () => {
  beforeEach(() => vi.clearAllMocks());

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
  }

  it("renders for unknown routes instead of a blank page", () => {
    renderAt("/some/random/page");
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("navigates home and to the leaderboard", async () => {
    const user = userEvent.setup();
    renderAt("/nope");
    await user.click(screen.getByText("Back to Home"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
    await user.click(screen.getByText("Leaderboard"));
    expect(mockNavigate).toHaveBeenCalledWith("/leaderboard");
  });
});
