import { expect, test } from "@playwright/test";
import { logIn, makeFavoritePlayer, mockApi, OTHER_PLAYER } from "./mockApi";

test("leaderboard pages through the ladder and keeps the page in the URL", async ({ page }) => {
  await mockApi(page);
  await page.goto("/leaderboard");

  await expect(page.getByText("Ladder1#NA1")).toBeVisible();
  await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();

  await page.getByRole("button", { name: /Next/ }).click();
  await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
  await expect(page.getByText("Ladder1#NA1")).toHaveCount(0);

  // A reload lands on the same page
  await page.reload();
  await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
});

test("logged in, favorites show on the home page and removing one can be undone", async ({ page }) => {
  await mockApi(page, {
    favorites: [makeFavoritePlayer({ puuid: OTHER_PLAYER.puuid, gameName: "Caps", tagLine: "EUW", region: "EUW" })],
  });
  await logIn(page);
  await page.goto("/");

  const favorites = page.getByRole("region", { name: "Favorites" });
  await expect(favorites.getByText("Caps", { exact: true })).toBeVisible();

  await favorites.getByRole("button", { name: "Remove Caps from favorites" }).click();
  await expect(page.getByRole("status")).toContainText("Removed Caps from favorites");
  await expect(favorites.getByText("Caps", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(favorites.getByText("Caps", { exact: true })).toBeVisible();
});

test("unknown pages show a 404 with a way home", async ({ page }) => {
  await mockApi(page);
  await page.goto("/some/random/page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

for (const path of ["/", "/player/NA/Faker/KR1", "/leaderboard"]) {
  test(`${path} fits the screen without sideways scrolling`, async ({ page }) => {
    await mockApi(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
