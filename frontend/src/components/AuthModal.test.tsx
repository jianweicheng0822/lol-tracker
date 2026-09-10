import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthModal from "./AuthModal";
import * as api from "../api";

vi.mock("../api", () => ({
  login: vi.fn(),
  register: vi.fn(),
  getOAuthUrl: vi.fn((provider: string) => `http://localhost:8080/api/oauth2/${provider}/authorize`),
  fetchOAuthProviders: vi.fn(),
}));

describe("AuthModal", () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: false, discord: false });
  });

  it("renders login form by default", () => {
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("toggles to register mode", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByText("Register"));
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("toggles back to login mode", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByText("Register"));
    await user.click(screen.getByText("Log in"));
    expect(screen.getByRole("heading", { name: "Log In" })).toBeInTheDocument();
  });

  it("disables submit when fields are empty", () => {
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    const submit = screen.getByRole("button", { name: "Log In" });
    expect(submit).toBeDisabled();
  });

  it("calls login on submit in login mode", async () => {
    vi.mocked(api.login).mockResolvedValue({ token: "abc" });
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.type(screen.getByPlaceholderText("Username"), "testuser");
    await user.type(screen.getByPlaceholderText("Password"), "testpass");
    await user.click(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith("testuser", "testpass");
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("calls register on submit in register mode", async () => {
    vi.mocked(api.register).mockResolvedValue({ token: "abc" });
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByText("Register"));
    await user.type(screen.getByPlaceholderText("Username"), "newuser");
    await user.type(screen.getByPlaceholderText("Password"), "newpass");
    await user.click(screen.getByRole("button", { name: "Register" }));
    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith("newuser", "newpass");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("displays error on login failure", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.type(screen.getByPlaceholderText("Username"), "testuser");
    await user.type(screen.getByPlaceholderText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on backdrop click", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    // Click the outer overlay div (backdrop) - the fixed-position container
    const heading = screen.getByRole("heading", { name: "Log In" });
    const backdrop = heading.closest("[style*='position: fixed']")!;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  // --- OAuth2 tests ---

  it("shows Google button when provider is configured", async () => {
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: true, discord: false });
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    });
    expect(screen.queryByText("Continue with Discord")).not.toBeInTheDocument();
  });

  it("shows Discord button when provider is configured", async () => {
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: false, discord: true });
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Continue with Discord")).toBeInTheDocument();
    });
    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
  });

  it("shows both OAuth buttons when both are configured", async () => {
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: true, discord: true });
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      expect(screen.getByText("Continue with Discord")).toBeInTheDocument();
    });
  });

  it("hides OAuth section when no providers configured", async () => {
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: false, discord: false });
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(api.fetchOAuthProviders).toHaveBeenCalled();
    });
    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
    expect(screen.queryByText("Continue with Discord")).not.toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();
  });
});
