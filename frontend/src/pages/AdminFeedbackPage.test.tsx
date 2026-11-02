import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminFeedbackPage from "./AdminFeedbackPage";
import * as api from "../api";
import type { FeedbackEntry } from "../api";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    fetchAdminFeedback: vi.fn(),
    setFeedbackResolved: vi.fn(),
  };
});

vi.mock("../components/AppHeader", () => ({ default: () => <div data-testid="header" /> }));
vi.mock("../components/SearchBar", () => ({ default: () => <div data-testid="search-bar" /> }));

const entry = (over: Partial<FeedbackEntry>): FeedbackEntry => ({
  id: 1,
  type: "bug",
  message: "Leaderboard is blank",
  email: "me@example.com",
  username: null,
  pageUrl: "/leaderboard",
  userAgent: "TestBrowser",
  resolved: false,
  createdAt: "2026-11-01T12:00:00Z",
  ...over,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminFeedbackPage />
    </MemoryRouter>,
  );
}

describe("AdminFeedbackPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists open feedback first, with filters and counts", async () => {
    vi.mocked(api.fetchAdminFeedback).mockResolvedValue([
      entry({ id: 1, message: "Leaderboard is blank" }),
      entry({ id: 2, type: "idea", message: "Add dark mode", resolved: true }),
    ]);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Leaderboard is blank")).toBeInTheDocument();
    expect(screen.queryByText("Add dark mode")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open (1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "me@example.com" })).toHaveAttribute("href", "mailto:me@example.com");

    await user.click(screen.getByRole("tab", { name: "Resolved (1)" }));
    expect(screen.getByText("Add dark mode")).toBeInTheDocument();
    expect(screen.queryByText("Leaderboard is blank")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "All (2)" }));
    expect(screen.getByText("Add dark mode")).toBeInTheDocument();
    expect(screen.getByText("Leaderboard is blank")).toBeInTheDocument();
  });

  it("marks an entry resolved, which moves it out of Open", async () => {
    vi.mocked(api.fetchAdminFeedback).mockResolvedValue([entry({ id: 1 })]);
    vi.mocked(api.setFeedbackResolved).mockResolvedValue(entry({ id: 1, resolved: true }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Mark resolved" }));
    expect(api.setFeedbackResolved).toHaveBeenCalledWith(1, true);
    expect(await screen.findByText("Nothing open. All caught up!")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Resolved (1)" })).toBeInTheDocument();
  });

  it("asks to log in when not logged in", async () => {
    vi.mocked(api.fetchAdminFeedback).mockRejectedValue(new api.AuthRequiredError());
    renderPage();
    expect(await screen.findByText("Log in with an admin account to see feedback.")).toBeInTheDocument();
  });

  it("shows the normal 404 page to non-admins", async () => {
    vi.mocked(api.fetchAdminFeedback).mockRejectedValue(new api.NotAdminError());
    renderPage();
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
  });
});
