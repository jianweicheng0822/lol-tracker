import { renderHook } from "@testing-library/react";
import { DEFAULT_TITLE, useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = "";
  });

  it("puts the page title before the site name", () => {
    renderHook(() => useDocumentTitle("Leaderboard"));
    expect(document.title).toBe("Leaderboard · LoL Tracker");
  });

  it("shows the descriptive default title without a page title", () => {
    renderHook(() => useDocumentTitle(null));
    expect(document.title).toBe("LoL Tracker: League of Legends Stats & Match History");
  });

  it("updates when the title changes, e.g. once a player has loaded", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: null as string | null },
    });
    rerender({ title: "Faker#KR1" });
    expect(document.title).toBe("Faker#KR1 · LoL Tracker");
  });

  it("resets to the default title when the page unmounts", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Multi-Search"));
    unmount();
    expect(document.title).toBe(DEFAULT_TITLE);
  });
});
