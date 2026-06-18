import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./useIsMobile";

function setWidth(w: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: w });
}

describe("useIsMobile", () => {
  const original = window.innerWidth;
  afterEach(() => setWidth(original));

  it("returns true when window width is below default breakpoint", () => {
    setWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when window width is at or above default breakpoint", () => {
    setWidth(768);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("respects a custom breakpoint", () => {
    setWidth(900);
    const { result } = renderHook(() => useIsMobile(1024));
    expect(result.current).toBe(true);
  });

  it("updates on window resize", () => {
    setWidth(1000);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWidth(500);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(true);
  });

  it("cleans up resize listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeSpy.mockRestore();
  });
});
