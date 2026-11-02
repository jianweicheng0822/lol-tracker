import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FeedbackButton from "./FeedbackButton";
import * as api from "../api";

vi.mock("../api", () => ({ submitFeedback: vi.fn() }));

function renderAt(path = "/leaderboard?region=EUW") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackButton />
    </MemoryRouter>,
  );
}

describe("FeedbackButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the form from the floating button", async () => {
    const user = userEvent.setup();
    renderAt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Send Feedback" })).toBeInTheDocument();
  });

  it("keeps Send disabled until the message has 5 characters", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText("Your feedback"), "  hi  ");
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText("Your feedback"), "there");
    expect(send).toBeEnabled();
    expect(screen.getByText("11 / 1000")).toBeInTheDocument();
  });

  it("sends type, trimmed message, email and the current page, then thanks the user", async () => {
    vi.mocked(api.submitFeedback).mockResolvedValue();
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    await user.click(screen.getByRole("radio", { name: /Idea/ }));
    await user.type(screen.getByLabelText("Your feedback"), "  Add a dark mode  ");
    await user.type(screen.getByLabelText("Email (optional)"), "me@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(api.submitFeedback).toHaveBeenCalledWith({
      type: "idea",
      message: "Add a dark mode",
      email: "me@example.com",
      pageUrl: "/leaderboard?region=EUW",
      website: "",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Thanks! Your feedback was sent.")).toBeInTheDocument();
  });

  it("shows the server's error and keeps the form open", async () => {
    vi.mocked(api.submitFeedback).mockRejectedValue(new Error("Too many requests. Please wait."));
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    await user.type(screen.getByLabelText("Your feedback"), "Something broke");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Please wait.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Your feedback")).toHaveValue("Something broke");
  });

  it("closes on Escape and on the close button", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
