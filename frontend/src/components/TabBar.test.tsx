import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TabBar from "./TabBar";

describe("TabBar", () => {
  it("renders both tabs", () => {
    render(<TabBar activeTab="overview" onTabChange={vi.fn()} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Champions")).toBeInTheDocument();
  });

  it("applies active styling to the active tab", () => {
    render(<TabBar activeTab="champions" onTabChange={vi.fn()} />);
    const champBtn = screen.getByText("Champions");
    expect(champBtn).toHaveStyle({ fontWeight: 600 });
    const overviewBtn = screen.getByText("Overview");
    expect(overviewBtn).toHaveStyle({ fontWeight: 500 });
  });

  it("fires onTabChange with the correct TabId on click", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<TabBar activeTab="overview" onTabChange={handler} />);

    await user.click(screen.getByText("Champions"));
    expect(handler).toHaveBeenCalledWith("champions");

    await user.click(screen.getByText("Overview"));
    expect(handler).toHaveBeenCalledWith("overview");
  });
});
