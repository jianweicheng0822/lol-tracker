import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the live site, run by CI right after a deploy. Read-only, real data:
 * they confirm the deployed site works end to end (frontend, backend, Riot API), which the
 * mocked e2e tests can't.
 */
export default defineConfig({
  testDir: "./smoke",
  retries: 2,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "https://loltracker.lol",
    trace: "retain-on-failure",
  },
  // Live Riot lookups can be slow on a cold cache
  expect: { timeout: 30_000 },
  timeout: 90_000,
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
