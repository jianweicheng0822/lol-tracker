import { renderHook } from "@testing-library/react";
import { useBodyScrollLock } from "./useBodyScrollLock";

describe("useBodyScrollLock", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("locks page scrolling while mounted and restores it after", () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderHook(() => useBodyScrollLock());
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("stays locked until the last of two stacked dialogs closes", () => {
    const first = renderHook(() => useBodyScrollLock());
    const second = renderHook(() => useBodyScrollLock());
    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");
    second.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
