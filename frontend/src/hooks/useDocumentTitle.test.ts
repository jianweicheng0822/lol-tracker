import { renderHook } from "@testing-library/react";
import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = "";
  });

  it("puts the page title before the site name", () => {
    renderHook(() => useDocumentTitle("Leaderboard"));
    expect(document.title).toBe("Leaderboard · LoL Tracker");
  });

  it("shows just the site name without a title", () => {
    renderHook(() => useDocumentTitle(null));
    expect(document.title).toBe("LoL Tracker");
  });

  it("updates when the title changes, e.g. once a player has loaded", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: null as string | null },
    });
    rerender({ title: "Faker#KR1" });
    expect(document.title).toBe("Faker#KR1 · LoL Tracker");
  });

  it("resets to the site name when the page unmounts", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Multi-Search"));
    unmount();
    expect(document.title).toBe("LoL Tracker");
  });
});
