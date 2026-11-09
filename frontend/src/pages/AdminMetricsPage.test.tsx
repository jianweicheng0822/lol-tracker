import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminMetricsPage from "./AdminMetricsPage";
import * as api from "../api";
import type { MetricsReport } from "../api";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, fetchAdminMetrics: vi.fn() };
});

vi.mock("../components/AppHeader", () => ({ default: () => <div data-testid="header" /> }));

const report: MetricsReport = {
  zone: "America/Denver",
  from: "2026-11-02",
  to: "2026-11-08",
  totals: { visitors: 12, newVisitors: 7, returningVisitors: 5, pageViews: 48, actions: 30, signups: 2 },
  daily: [
    { date: "2026-11-07", visitors: 4, newVisitors: 2, pageViews: 10, actions: 6 },
    { date: "2026-11-08", visitors: 8, newVisitors: 5, pageViews: 38, actions: 24 },
  ],
  features: [{ name: "player_view", count: 20, visitors: 9 }, { name: "ai_analysis", count: 3, visitors: 1 }],
  pages: [{ name: "home", count: 30, visitors: 12 }],
  referrers: [{ name: "reddit.com", count: 4, visitors: 3 }],
  recent: [{ at: "2026-11-08T18:00:00Z", event: "player_view", detail: "NA", visitor: "a1b2c3", username: "alice" }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMetricsPage />
    </MemoryRouter>,
  );
}

describe("AdminMetricsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows totals, features, referrers and recent activity", async () => {
    vi.mocked(api.fetchAdminMetrics).mockResolvedValue(report);
    renderPage();

    expect(await screen.findByText("Visitors per day")).toBeInTheDocument();
    expect(api.fetchAdminMetrics).toHaveBeenCalledWith(14);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getAllByText("Opened a player").length).toBeGreaterThan(0);
    expect(screen.getByText("AI analysis")).toBeInTheDocument();
    expect(screen.getByText("reddit.com")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("reloads when the range changes", async () => {
    vi.mocked(api.fetchAdminMetrics).mockResolvedValue(report);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Visitors per day");

    await user.click(screen.getByRole("tab", { name: "30d" }));
    expect(api.fetchAdminMetrics).toHaveBeenLastCalledWith(30);
  });

  it("shows the normal 404 page to non-admins", async () => {
    vi.mocked(api.fetchAdminMetrics).mockRejectedValue(new api.NotAdminError());
    renderPage();
    expect(await screen.findByRole("button", { name: "Back to Home" })).toBeInTheDocument();
    expect(screen.queryByText("Usage")).not.toBeInTheDocument();
  });
});
