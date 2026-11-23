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
    expect(screen.getByRole("tab", { name: "Log In" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("toggles to register mode", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    expect(screen.getByRole("tab", { name: "Create Account" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("toggles back to login mode", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    await user.click(screen.getByRole("tab", { name: "Log In" }));
    expect(screen.getByRole("tab", { name: "Log In" })).toHaveAttribute("aria-selected", "true");
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
    await user.type(screen.getByLabelText("Password"), "testpass");
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
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    await user.type(screen.getByPlaceholderText("Username"), "newuser");
    await user.type(screen.getByLabelText("Password"), "newpass123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith("newuser", "newpass123");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows the password rule up front when registering", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("placeholder", "Password");

    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("placeholder", "Password (8+ characters)");
  });

  it("rejects a short password before submitting a registration", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    await user.type(screen.getByPlaceholderText("Username"), "newuser");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("rejects a password over 72 bytes before submitting a registration", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    await user.type(screen.getByPlaceholderText("Username"), "newuser");
    // 25 Chinese characters are 75 bytes
    await user.type(screen.getByLabelText("Password"), "密".repeat(25));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText(/Password is too long/)).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("sends the username without surrounding spaces", async () => {
    vi.mocked(api.register).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    await user.type(screen.getByPlaceholderText("Username"), "  newuser ");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(api.register).toHaveBeenCalledWith("newuser", "password123");
  });

  it("rejects a username over 50 characters before submitting a registration", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    await user.type(screen.getByPlaceholderText("Username"), "a".repeat(51));
    await user.type(screen.getByLabelText("Password"), "longenough");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Username can be at most 50 characters.")).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("doesn't apply the sign-up password rule when logging in", async () => {
    vi.mocked(api.login).mockResolvedValue({ token: "abc" });
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.type(screen.getByPlaceholderText("Username"), "olduser");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(api.login).toHaveBeenCalledWith("olduser", "short"));
  });

  it("tells password managers which fields are which", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByPlaceholderText("Username")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");

    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    // On sign-up, managers can offer to generate and save a new password
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("displays error on login failure", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await user.type(screen.getByPlaceholderText("Username"), "testuser");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
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
    const tab = screen.getByRole("tab", { name: "Log In" });
    const backdrop = tab.closest("[style*='position: fixed']")!;
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

  it("puts Google and Discord above the username form", async () => {
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: true, discord: true });
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);

    const google = await screen.findByText("Continue with Google");
    const usernameInput = screen.getByPlaceholderText("Username");
    expect(google.compareDocumentPosition(usernameInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("warns on sign-up that a username password can't be recovered", async () => {
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);

    // Logging in to an existing account doesn't need the warning
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    expect(screen.getByRole("note")).toHaveTextContent("Forgotten passwords can't be reset.");
  });

  it("says Sign up on the Google and Discord buttons when creating an account", async () => {
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: true, discord: true });
    const user = userEvent.setup();
    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />);
    await screen.findByText("Continue with Google");

    await user.click(screen.getByRole("tab", { name: "Create Account" }));
    expect(screen.getByText("Sign up with Google")).toBeInTheDocument();
    expect(screen.getByText("Sign up with Discord")).toBeInTheDocument();
  });
});
