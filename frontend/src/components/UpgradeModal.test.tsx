import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpgradeModal from "./UpgradeModal";
import * as api from "../api";

vi.mock("../api", () => ({
  getAuthToken: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

describe("UpgradeModal", () => {
  const defaultProps = {
    onClose: vi.fn(),
    onShowAuth: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAuthToken).mockReturnValue("token");
  });

  it("renders the modal with PRO badge and title", () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getAllByText("PRO").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Upgrade Your Tracker")).toBeInTheDocument();
  });

  it("renders pricing information", () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText("$4.99")).toBeInTheDocument();
    expect(screen.getByText("/month")).toBeInTheDocument();
  });

  it("renders feature comparison table", () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText("AI Match Coaching")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
  });

  it("shows Subscribe button when logged in", () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText("Subscribe with Stripe")).toBeInTheDocument();
  });

  it("shows Log in button when not logged in", () => {
    vi.mocked(api.getAuthToken).mockReturnValue(null);
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText("Log in to Subscribe")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<UpgradeModal {...defaultProps} />);
    // Click the overlay (first child)
    await user.click(container.firstChild as HTMLElement);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<UpgradeModal {...defaultProps} />);
    await user.click(screen.getByText("\u00d7"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onClose and onShowAuth when not logged in and subscribe clicked", async () => {
    vi.mocked(api.getAuthToken).mockReturnValue(null);
    const user = userEvent.setup();
    render(<UpgradeModal {...defaultProps} />);
    await user.click(screen.getByText("Log in to Subscribe"));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onShowAuth).toHaveBeenCalled();
  });

  it("redirects to Stripe checkout when logged in and subscribe clicked", async () => {
    vi.mocked(api.createCheckoutSession).mockResolvedValue({ url: "https://checkout.stripe.com/test" });
    const user = userEvent.setup();
    // Mock window.location.href
    const hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
    Object.defineProperty(window.location, "href", {
      set: hrefSetter,
      get: () => "",
    });

    render(<UpgradeModal {...defaultProps} />);
    await user.click(screen.getByText("Subscribe with Stripe"));
    await waitFor(() => {
      expect(api.createCheckoutSession).toHaveBeenCalled();
    });
  });

  it("shows error message on checkout failure", async () => {
    vi.mocked(api.createCheckoutSession).mockRejectedValue(new Error("Payment failed"));
    const user = userEvent.setup();
    render(<UpgradeModal {...defaultProps} />);
    await user.click(screen.getByText("Subscribe with Stripe"));
    await waitFor(() => {
      expect(screen.getByText("Payment failed")).toBeInTheDocument();
    });
  });

  it("renders disclaimer text", () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText("Cancel anytime. No long-term commitment.")).toBeInTheDocument();
  });
});
