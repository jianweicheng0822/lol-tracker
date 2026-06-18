import { renderHook, act } from "@testing-library/react";

const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

import { useTabNavigation } from "./useTabNavigation";

describe("useTabNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("tab");
  });

  it("defaults to 'overview' when no tab param is set", () => {
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current[0]).toBe("overview");
  });

  it("reads a valid tab from search params", () => {
    mockSearchParams.set("tab", "champions");
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current[0]).toBe("champions");
  });

  it("falls back to 'overview' for invalid tab values", () => {
    mockSearchParams.set("tab", "bogus");
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current[0]).toBe("overview");
  });

  it("setTab calls setSearchParams with replace: false", () => {
    const { result } = renderHook(() => useTabNavigation());
    act(() => {
      result.current[1]("champions");
    });
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: "champions" },
      { replace: false },
    );
  });
});
