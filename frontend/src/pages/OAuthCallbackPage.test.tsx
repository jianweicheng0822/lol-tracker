import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OAuthCallbackPage from "./OAuthCallbackPage";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
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
  });

  it("stores token and redirects to home on success", () => {
    mockSearchParams = new URLSearchParams("token=jwt-abc-123");
    render(<OAuthCallbackPage />);

    expect(mockSetAuthToken).toHaveBeenCalledWith("jwt-abc-123");
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
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
});
