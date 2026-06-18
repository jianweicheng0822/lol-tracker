import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FavoritesList from "./FavoritesList";
import { makeFavoritePlayer } from "../test/fixtures";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api", () => ({
  removeFavorite: vi.fn(() => Promise.resolve()),
}));

import { removeFavorite } from "../api";

describe("FavoritesList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when favorites is empty", () => {
    const { container } = render(<FavoritesList favorites={[]} onUpdate={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders favorite chips", () => {
    const favs = [
      makeFavoritePlayer({ id: 1, gameName: "Player1", tagLine: "NA1" }),
      makeFavoritePlayer({ id: 2, gameName: "Player2", tagLine: "EUW" }),
    ];
    render(<FavoritesList favorites={favs} onUpdate={vi.fn()} />);
    expect(screen.getByText("Player1#NA1")).toBeInTheDocument();
    expect(screen.getByText("Player2#EUW")).toBeInTheDocument();
  });

  it("navigates to player page on chip click", async () => {
    const user = userEvent.setup();
    const fav = makeFavoritePlayer({ gameName: "Faker", tagLine: "KR1", region: "KR" });
    render(<FavoritesList favorites={[fav]} onUpdate={vi.fn()} />);
    await user.click(screen.getByText("Faker#KR1"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/KR/Faker/KR1");
  });

  it("calls removeFavorite and onUpdate when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const fav = makeFavoritePlayer({ puuid: "remove-me" });
    render(<FavoritesList favorites={[fav]} onUpdate={onUpdate} />);

    await user.click(screen.getByTitle("Remove"));
    await waitFor(() => {
      expect(removeFavorite).toHaveBeenCalledWith("remove-me");
      expect(onUpdate).toHaveBeenCalledOnce();
    });
  });
});
