import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "./SearchBar";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("SearchBar", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renders region select, game name input, tag input, and search button", () => {
    render(<SearchBar />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Game Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("#Tag")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("disables search button when fields are empty", () => {
    render(<SearchBar />);
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("enables search button when both fields have values", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Faker");
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    expect(screen.getByRole("button", { name: "Search" })).toBeEnabled();
  });

  it("navigates to player page on button click", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Faker");
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Faker/KR1");
  });

  it("navigates on Enter key press", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Faker");
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    await user.keyboard("{Enter}");
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Faker/KR1");
  });

  it("strips leading # from tag", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("Game Name"), "Player");
    await user.type(screen.getByPlaceholderText("#Tag"), "#NA1");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(mockNavigate).toHaveBeenCalledWith("/player/NA/Player/NA1");
  });

  it("does not navigate when game name is empty", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText("#Tag"), "KR1");
    await user.keyboard("{Enter}");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("pre-populates with initial values", () => {
    render(<SearchBar initialRegion="EUW" initialGameName="Test" initialTag="001" />);
    expect(screen.getByPlaceholderText("Game Name")).toHaveValue("Test");
    expect(screen.getByPlaceholderText("#Tag")).toHaveValue("001");
    expect(screen.getByRole("combobox")).toHaveValue("EUW");
  });
});
