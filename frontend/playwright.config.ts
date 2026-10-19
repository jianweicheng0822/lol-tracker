import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: the production build in a real browser, with the backend API mocked
 * (see e2e/mockApi.ts) so runs are deterministic and don't depend on Riot. CI runs them before
 * deploying. `npm run build` first; the web server only serves dist/.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4174",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npx vite preview --port 4174 --strictPort",
    url: "http://localhost:4174",
    reuseExistingServer: !process.env.CI,
  },
});
