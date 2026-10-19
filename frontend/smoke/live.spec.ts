import { expect, test } from "@playwright/test";

test("the backend is up", async ({ request }) => {
  const res = await request.get("/api/tier");
  expect(res.status()).toBe(200);
});

test("home page loads with the search box", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/LoL Tracker/);
  await expect(page.getByPlaceholder("Game Name")).toBeVisible();
});

test("leaderboard lists players, and a player's page loads their matches", async ({ page }) => {
  await page.goto("/leaderboard");
  // A loaded row, not a loading placeholder (right after a deploy the cache is cold and the
  // placeholders show for a while; clicking one does nothing)
  const firstRow = page.locator("tbody tr", { hasText: "LP" }).first();
  await expect(firstRow).toBeVisible();

  await firstRow.click();
  await expect(page).toHaveURL(/\/player\//);
  await expect(page.getByTitle("Expand scoreboard").first()).toBeVisible();
});
