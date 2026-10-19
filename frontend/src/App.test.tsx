import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useState } from "react";
import App from "./App";

// Stand-in player page: counts its own mounts, so a remount shows up as a reset count
let mounts = 0;
vi.mock("./pages/PlayerPage", () => ({
  default: function FakePlayerPage() {
    const [mountId] = useState(() => ++mounts);
    const navigate = useNavigate();
    return (
      <div>
        <span data-testid="mount">{mountId}</span>
        <button onClick={() => navigate("/player/EUW/Caps/EUW")}>Other player</button>
        <button onClick={() => navigate("?tab=champions")}>Champions tab</button>
      </div>
    );
  },
}));

describe("App player route", () => {
  beforeEach(() => { mounts = 0; });

  it("starts a fresh page for another player, but keeps it when only the tab changes", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/player/KR/Faker/KR1"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("mount")).toHaveTextContent("1");

    await user.click(screen.getByText("Champions tab"));
    expect(screen.getByTestId("mount")).toHaveTextContent("1");

    await user.click(screen.getByText("Other player"));
    expect(screen.getByTestId("mount")).toHaveTextContent("2");
  });
});
