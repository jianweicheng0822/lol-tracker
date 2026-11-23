import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkedAccountsModal from "./LinkedAccountsModal";
import * as api from "../api";

vi.mock("../api", () => ({
  fetchLinkedAccounts: vi.fn(),
  fetchOAuthProviders: vi.fn(),
  startOAuthLink: vi.fn(),
  changeUsername: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ isLoggedIn: true, username: "google" }),
}));

describe("LinkedAccountsModal", () => {
  const onClose = vi.fn();
  const assign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: true, discord: true });
    vi.stubGlobal("location", { ...window.location, assign, pathname: "/player/NA/Faker/KR1", search: "" });
  });

  // --- username ---

  it("shows the username and changes it", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: false, linked: ["google"] });
    vi.mocked(api.changeUsername).mockResolvedValue("李明");
    const user = userEvent.setup();
    render(<LinkedAccountsModal onClose={onClose} />);

    expect(screen.getByText("google")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change username" }));
    const input = screen.getByRole("textbox", { name: "New username" });
    expect(input).toHaveValue("google");
    await user.clear(input);
    await user.type(input, "  李明 {Enter}");

    expect(api.changeUsername).toHaveBeenCalledWith("李明");
    expect(await screen.findByRole("status")).toHaveTextContent("Username changed");
    expect(screen.queryByRole("textbox", { name: "New username" })).not.toBeInTheDocument();
  });

  it("shows the server's error and keeps the edit open", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: [] });
    vi.mocked(api.changeUsername).mockRejectedValue(new Error("Username already taken"));
    const user = userEvent.setup();
    render(<LinkedAccountsModal onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Change username" }));
    const input = screen.getByRole("textbox", { name: "New username" });
    await user.clear(input);
    await user.type(input, "bob");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Username already taken");
    expect(input).toHaveValue("bob");
  });

  it("doesn't call the server for a blank or unchanged name", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: [] });
    const user = userEvent.setup();
    render(<LinkedAccountsModal onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Change username" }));
    const input = screen.getByRole("textbox", { name: "New username" });
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Username is required");

    await user.type(input, "google");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("textbox", { name: "New username" })).not.toBeInTheDocument();
    expect(api.changeUsername).not.toHaveBeenCalled();
  });

  it("Escape cancels the edit first, then closes", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: [] });
    const user = userEvent.setup();
    render(<LinkedAccountsModal onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Change username" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: "New username" })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  function rowFor(label: string) {
    return screen.getByText(label).closest("div")!;
  }

  it("shows the password and which providers are linked", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: ["discord"] });
    render(<LinkedAccountsModal onClose={onClose} />);

    expect(await screen.findByText("In use")).toBeInTheDocument();
    expect(within(rowFor("Discord")).getByText("Linked ✓")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link Google" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Link Discord" })).not.toBeInTheDocument();
  });

  it("says when there's no password (signed up with Google or Discord)", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: false, linked: ["google"] });
    render(<LinkedAccountsModal onClose={onClose} />);

    expect(await screen.findByText("Not set")).toBeInTheDocument();
  });

  it("hides the Link button for a provider the server isn't set up for", async () => {
    vi.mocked(api.fetchOAuthProviders).mockResolvedValue({ google: true, discord: false });
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: [] });
    render(<LinkedAccountsModal onClose={onClose} />);

    expect(await screen.findByRole("button", { name: "Link Google" })).toBeInTheDocument();
    expect(screen.queryByText("Discord")).not.toBeInTheDocument();
  });

  it("goes to the provider to link, remembering the page to come back to", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: [] });
    vi.mocked(api.startOAuthLink).mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?state=s");
    const user = userEvent.setup();
    render(<LinkedAccountsModal onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: "Link Google" }));

    expect(api.startOAuthLink).toHaveBeenCalledWith("google");
    expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?state=s");
    expect(sessionStorage.getItem("lol_link_return")).toBe("/player/NA/Faker/KR1");
  });

  it("shows an error when linking can't start", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: [] });
    vi.mocked(api.startOAuthLink).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<LinkedAccountsModal onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: "Link Discord" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't start linking");
    expect(assign).not.toHaveBeenCalled();
    // The buttons work again for another try
    expect(screen.getByRole("button", { name: "Link Discord" })).toBeEnabled();
  });

  it("closes on Escape", async () => {
    vi.mocked(api.fetchLinkedAccounts).mockResolvedValue({ hasPassword: true, linked: [] });
    const user = userEvent.setup();
    render(<LinkedAccountsModal onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
