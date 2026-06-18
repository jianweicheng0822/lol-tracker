import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileHeader from "./ProfileHeader";
import { makeAccount } from "../test/fixtures";

vi.mock("../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
}));

describe("ProfileHeader", () => {
  const defaultProps = {
    account: makeAccount(),
    region: "NA",
    isFav: false,
    onToggleFavorite: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it("renders gameName and tagLine", () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText("TestPlayer")).toBeInTheDocument();
    expect(screen.getByText(/NA1/)).toBeInTheDocument();
  });

  it("renders region label", () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText("NA")).toBeInTheDocument();
  });

  it("renders profile icon with correct src", () => {
    render(<ProfileHeader {...defaultProps} />);
    const img = screen.getByAltText("Profile Icon") as HTMLImageElement;
    expect(img.src).toContain("4567.png");
  });

  it("shows '\u2606 Favorite' when not favorited", () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText("\u2606 Favorite")).toBeInTheDocument();
  });

  it("shows '\u2605 Favorited' when favorited", () => {
    render(<ProfileHeader {...defaultProps} isFav={true} />);
    expect(screen.getByText("\u2605 Favorited")).toBeInTheDocument();
  });

  it("calls onToggleFavorite when favorite button is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<ProfileHeader {...defaultProps} onToggleFavorite={handler} />);
    await user.click(screen.getByText("\u2606 Favorite"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls onRefresh when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<ProfileHeader {...defaultProps} onRefresh={handler} />);
    await user.click(screen.getByTitle("Refresh data"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("shows win streak badge when streak >= 2", () => {
    render(<ProfileHeader {...defaultProps} streak={{ type: "win", count: 5 }} />);
    expect(screen.getByText(/5W Streak/)).toBeInTheDocument();
  });

  it("shows loss streak badge when streak >= 2", () => {
    render(<ProfileHeader {...defaultProps} streak={{ type: "loss", count: 3 }} />);
    expect(screen.getByText(/3L Streak/)).toBeInTheDocument();
  });

  it("does not show streak badge when streak is null", () => {
    render(<ProfileHeader {...defaultProps} streak={null} />);
    expect(screen.queryByText(/Streak/)).not.toBeInTheDocument();
  });

  it("shows climbing indicator", () => {
    render(<ProfileHeader {...defaultProps} climbStatus="climbing" />);
    expect(screen.getByText(/Climbing/)).toBeInTheDocument();
  });

  it("shows falling indicator", () => {
    render(<ProfileHeader {...defaultProps} climbStatus="falling" />);
    expect(screen.getByText(/Falling/)).toBeInTheDocument();
  });

  it("does not show climb indicator when stable", () => {
    render(<ProfileHeader {...defaultProps} climbStatus="stable" />);
    expect(screen.queryByText(/Climbing/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Falling/)).not.toBeInTheDocument();
  });
});
