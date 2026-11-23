import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OAuthCallbackPage from "./OAuthCallbackPage";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockHash = "";

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
  useLocation: () => ({ hash: mockHash }),
}));

const mockSetAuthToken = vi.fn();

vi.mock("../api", () => ({
  setAuthToken: (token: string | null) => mockSetAuthToken(token),
}));

describe("OAuthCallbackPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSetAuthToken.mockReset();
    mockSearchParams = new URLSearchParams();
    mockHash = "";
    sessionStorage.clear();
  });

  it("stores the token from the URL fragment and redirects home, replacing the history entry", () => {
    mockHash = "#token=jwt-abc-123";
    render(<OAuthCallbackPage />);

    expect(mockSetAuthToken).toHaveBeenCalledWith("jwt-abc-123");
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("ignores a token in the query string", () => {
    mockSearchParams = new URLSearchParams("token=jwt-abc-123");
    render(<OAuthCallbackPage />);

    expect(mockSetAuthToken).not.toHaveBeenCalled();
    expect(screen.getByText("No authentication token received.")).toBeInTheDocument();
  });

  it("shows error when error param is present", () => {
    mockSearchParams = new URLSearchParams("error=auth_failed");
    render(<OAuthCallbackPage />);

    expect(screen.getByText("Authentication failed. Please try again.")).toBeInTheDocument();
    expect(mockSetAuthToken).not.toHaveBeenCalled();
  });

  it("shows error when no token or error param", () => {
    mockSearchParams = new URLSearchParams();
    render(<OAuthCallbackPage />);

    expect(screen.getByText("No authentication token received.")).toBeInTheDocument();
  });

  it("has a back to home button on error", async () => {
    mockSearchParams = new URLSearchParams("error=auth_failed");
    const user = userEvent.setup();
    render(<OAuthCallbackPage />);

    await user.click(screen.getByText("Back to Home"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  // --- Coming back from linking Google/Discord to an account that's already logged in ---

  it("after linking, goes back to the page the user was on with a toast, without touching the token", () => {
    sessionStorage.setItem("lol_link_return", "/player/NA/Faker/KR1");
    mockSearchParams = new URLSearchParams("linked=google");
    render(<OAuthCallbackPage />);

    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Faker/KR1", { replace: true, state: { toast: "Google linked" } });
    expect(mockSetAuthToken).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("lol_link_return")).toBeNull();
  });

  it("never follows a saved return path that points to another site", () => {
    sessionStorage.setItem("lol_link_return", "//evil.example/phish");
    mockSearchParams = new URLSearchParams("linked=discord");
    render(<OAuthCallbackPage />);

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true, state: { toast: "Discord linked" } });
  });

  it("explains when the Google account already belongs to someone else", () => {
    mockSearchParams = new URLSearchParams("link_error=taken&provider=google");
    render(<OAuthCallbackPage />);

    expect(screen.getByText("This Google account is already linked to a different account.")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("explains when a different account from that provider is already linked", () => {
    mockSearchParams = new URLSearchParams("link_error=provider_linked&provider=discord");
    render(<OAuthCallbackPage />);

    expect(screen.getByText("Your account already has a different Discord account linked.")).toBeInTheDocument();
  });

  it("goes back to where the user was after a failed link", async () => {
    sessionStorage.setItem("lol_link_return", "/leaderboard");
    mockSearchParams = new URLSearchParams("link_error=auth_failed&provider=google");
    const user = userEvent.setup();
    render(<OAuthCallbackPage />);

    expect(screen.getByText("Couldn't link the account. Please try again.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(mockNavigate).toHaveBeenCalledWith("/leaderboard");
  });
});
