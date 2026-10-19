import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("search a player, open a match and its page, then go back", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Game Name").fill("Faker");
  await page.getByPlaceholder("#Tag").fill("KR1");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/player\/NA\/Faker\/KR1$/);
  await expect(page.getByRole("heading", { name: /Faker/ })).toBeVisible();
  await expect(page.getByText("Diamond II").first()).toBeVisible();
  await expect(page.getByTitle("Expand scoreboard")).toHaveCount(5);

  await page.getByTitle("Expand scoreboard").first().click();
  const scoreboard = page.getByTestId("expanded-scoreboard");
  await expect(scoreboard.getByText("Enemy1")).toBeVisible();

  await scoreboard.getByRole("link", { name: /Open match page/ }).click();
  await expect(page).toHaveURL(/\/match\/NA\/NA1_100\?puuid=faker-puuid$/);
  await expect(page.getByText("Enemy1")).toBeVisible();

  await page.getByRole("button", { name: /Back/ }).click();
  await expect(page).toHaveURL(/\/player\/NA\/Faker\/KR1/);
  await expect(page.getByTitle("Expand scoreboard")).toHaveCount(5);
});

test("a pasted Riot ID is split into name and tag", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Game Name").fill("Faker#KR1");
  await expect(page.getByPlaceholder("Game Name")).toHaveValue("Faker");
  await expect(page.getByPlaceholder("#Tag")).toHaveValue("KR1");
});

test("an unknown player gets a not-found card with other regions to try", async ({ page }) => {
  await page.goto("/player/NA/Nobody/NA1");
  await expect(page.getByRole("heading", { name: /No player named Nobody#NA1 found in NA/ })).toBeVisible();
  await page.getByRole("button", { name: "EUW" }).click();
  await expect(page).toHaveURL(/\/player\/EUW\/Nobody\/NA1$/);
});

test("opening another player replaces the page instead of mixing the two", async ({ page }) => {
  await page.goto("/player/NA/Faker/KR1");
  await expect(page.getByRole("heading", { name: /Faker/ })).toBeVisible();

  // Client-side navigation, like following a link on the page
  await page.evaluate(() => {
    history.pushState({}, "", "/player/EUW/Caps/EUW");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { name: /Caps/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Faker/ })).toHaveCount(0);
  await expect(page).toHaveTitle(/^Caps#EUW/);
});
