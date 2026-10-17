import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FavoritesList from "./FavoritesList";
import { makeFavoritePlayer } from "../test/fixtures";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api", () => ({
  removeFavorite: vi.fn(() => Promise.resolve()),
  fetchAccountByPuuid: vi.fn(() => Promise.resolve({ profileIconId: 4567 })),
  fetchRanked: vi.fn(() => Promise.resolve([
    { queueType: "RANKED_FLEX_SR", tier: "GOLD", rank: "I", leaguePoints: 10, wins: 1, losses: 1 },
    { queueType: "RANKED_SOLO_5x5", tier: "DIAMOND", rank: "II", leaguePoints: 50, wins: 10, losses: 8 },
  ])),
  fetchMatchSummaries: vi.fn(() => Promise.resolve([{ win: true }, { win: false }, { win: true }])),
}));

vi.mock("../utils/ddragon", () => ({
  useDdragonVersion: () => "15.1.1",
  ddragonBase: () => "https://ddragon.leagueoflegends.com/cdn/15.1.1/img",
  hideOnError: vi.fn(),
}));

import { fetchMatchSummaries, fetchRanked, removeFavorite } from "../api";

const favs = (n: number) =>
  Array.from({ length: n }, (_, i) => makeFavoritePlayer({ id: i + 1, puuid: `p${i + 1}`, gameName: `Player${i + 1}` }));

describe("FavoritesList", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it("explains how to add favorites when there are none", () => {
    render(<FavoritesList favorites={[]} onUpdate={vi.fn()} />);
    expect(screen.getByText(/Keep your friends and rivals one click away/)).toBeInTheDocument();
  });

  it("shows each player's solo rank, icon and last ranked games", async () => {
    render(<FavoritesList favorites={favs(1)} onUpdate={vi.fn()} />);
    expect(screen.getByText("Player1")).toBeInTheDocument();

    // Solo queue, not flex
    expect(await screen.findByText("Diamond II")).toBeInTheDocument();
    expect(document.querySelector("img[src$='ranked-mini-crests/diamond.png']")).not.toBeNull();
    expect(screen.getByTitle("Player1#NA1 · Diamond II")).toBeInTheDocument();
    expect(screen.getAllByTestId("form-dot-win")).toHaveLength(2);
    expect(screen.getAllByTestId("form-dot-loss")).toHaveLength(1);
    expect(fetchMatchSummaries).toHaveBeenCalledWith("p1", "NA", 5, 0, 420);
    expect(document.querySelector("img[src$='profileicon/4567.png']")).not.toBeNull();
  });

  it("labels players without a solo rank as unranked", async () => {
    vi.mocked(fetchRanked).mockResolvedValueOnce([]);
    render(<FavoritesList favorites={favs(1)} onUpdate={vi.fn()} />);
    expect(await screen.findByText("Unranked")).toBeInTheDocument();
  });

  it("opens the player's page", async () => {
    const user = userEvent.setup();
    const fav = makeFavoritePlayer({ gameName: "Hide on bush", tagLine: "KR1", region: "KR" });
    render(<FavoritesList favorites={[fav]} onUpdate={vi.fn()} />);
    await user.click(screen.getByText("Hide on bush"));
    expect(mockNavigate).toHaveBeenCalledWith("/player/KR/Hide%20on%20bush/KR1");
  });

  it("hides a removed favorite and undo brings it back without touching the server", async () => {
    const user = userEvent.setup();
    const fav = makeFavoritePlayer({ puuid: "remove-me", gameName: "Faker" });
    render(<FavoritesList favorites={[fav]} onUpdate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Remove Faker from favorites" }));
    expect(screen.queryByText("Faker")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Removed Faker from favorites");

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Faker")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(removeFavorite).not.toHaveBeenCalled();
  });

  it("removes the favorite once the undo window passes", async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn();
    const fav = makeFavoritePlayer({ puuid: "remove-me", gameName: "Faker" });
    render(<FavoritesList favorites={[fav]} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Faker from favorites" }));
    expect(removeFavorite).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(removeFavorite).toHaveBeenCalledWith("remove-me");
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it("still removes the favorite when the page is left during the undo window", async () => {
    const user = userEvent.setup();
    const fav = makeFavoritePlayer({ puuid: "remove-me", gameName: "Faker" });
    const { unmount } = render(<FavoritesList favorites={[fav]} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Remove Faker from favorites" }));
    unmount();
    expect(removeFavorite).toHaveBeenCalledWith("remove-me");
  });

  it("shows six favorites and hides the rest behind View all", async () => {
    const user = userEvent.setup();
    render(<FavoritesList favorites={favs(8)} onUpdate={vi.fn()} />);
    expect(screen.getByText("Player6")).toBeInTheDocument();
    expect(screen.queryByText("Player7")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /View all 8/ }));
    expect(screen.getByText("Player8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });
});
