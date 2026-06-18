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

  it("shows '☆ Favorite' when not favorited", () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText("☆ Favorite")).toBeInTheDocument();
  });

  it("shows '★ Favorited' when favorited", () => {
    render(<ProfileHeader {...defaultProps} isFav={true} />);
    expect(screen.getByText("★ Favorited")).toBeInTheDocument();
  });

  it("calls onToggleFavorite when favorite button is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<ProfileHeader {...defaultProps} onToggleFavorite={handler} />);
    await user.click(screen.getByText("☆ Favorite"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls onRefresh when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<ProfileHeader {...defaultProps} onRefresh={handler} />);
    await user.click(screen.getByTitle("Refresh data"));
    expect(handler).toHaveBeenCalledOnce();
  });
});
