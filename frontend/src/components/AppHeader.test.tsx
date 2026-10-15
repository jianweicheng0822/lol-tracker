import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AppHeader from "./AppHeader";
import { setAuthToken, getAuthToken } from "../api";

vi.mock("./SearchBar", () => ({
  default: ({ initialGameName }: { initialGameName?: string }) => (
    <div data-testid="search-bar">{initialGameName}</div>
  ),
}));
vi.mock("./Toast", () => ({
  default: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));
// Simulates a successful login: stores a token the way api.login does
vi.mock("./AuthModal", () => ({
  default: ({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) => (
    <div data-testid="auth-modal">
      <button
        onClick={() => {
          setAuthToken(fakeToken("JIANWEICHENG"));
          onSuccess();
          onClose();
        }}
      >
        Submit login
      </button>
    </div>
  ),
}));

function fakeToken(sub: string): string {
  const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify({ sub }))}.sig`;
}

function renderHeader(props = {}, path = "/player/NA/Faker/KR1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppHeader {...props} />
    </MemoryRouter>,
  );
}

describe("AppHeader", () => {
  beforeEach(() => localStorage.clear());

  it("shows the logo, search and main navigation", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "LoL Tracker" })).toHaveAttribute("href", "/");
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute("href", "/leaderboard");
    expect(screen.getByRole("link", { name: "Multi-Search" })).toHaveAttribute("href", "/multi-search");
  });

  it("can hide the logo", () => {
    renderHeader({ showLogo: false });
    expect(screen.queryByRole("link", { name: "LoL Tracker" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leaderboard" })).toBeInTheDocument();
  });

  it("can hide the search box and pre-fill it", () => {
    const { unmount } = renderHeader({ showSearch: false });
    expect(screen.queryByTestId("search-bar")).not.toBeInTheDocument();
    unmount();

    renderHeader({ searchDefaults: { region: "NA", gameName: "Faker", tag: "KR1" } });
    expect(screen.getByTestId("search-bar")).toHaveTextContent("Faker");
  });

  it("highlights the link for the current page", () => {
    renderHeader({}, "/leaderboard?region=KR");
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Multi-Search" })).not.toHaveAttribute("aria-current");
  });

  it("offers Log in when logged out, and shows the username after logging in", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.click(screen.getByText("Submit login"));

    expect(screen.getByRole("button", { name: /JIANWEICHENG/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.getByTestId("toast")).toHaveTextContent("Logged in successfully");
  });

  it("shows the signed-in account and logs out from the menu", async () => {
    setAuthToken(fakeToken("JIANWEICHENG"));
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: /JIANWEICHENG/ }));
    expect(screen.getByRole("menu")).toHaveTextContent("Signed in as");

    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(getAuthToken()).toBeNull();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByTestId("toast")).toHaveTextContent("Logged out successfully");
  });

  it("closes the account menu on Escape or an outside click", async () => {
    setAuthToken(fakeToken("JIANWEICHENG"));
    const user = userEvent.setup();
    renderHeader();
    const account = screen.getByRole("button", { name: /JIANWEICHENG/ });

    await user.click(account);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(account);
    await user.click(screen.getByRole("link", { name: "LoL Tracker" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("follows logins and logouts that happen elsewhere on the page", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();

    // e.g. the favorite button's login prompt, or the OAuth callback
    act(() => setAuthToken(fakeToken("Caps")));
    expect(screen.getByRole("button", { name: /Caps/ })).toBeInTheDocument();
  });
});
