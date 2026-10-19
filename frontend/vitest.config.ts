import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Unit tests only; e2e/ holds the Playwright tests (npm run test:e2e)
    include: ["src/**/*.test.{ts,tsx}"],
    // Room for the 5s async waits in setup.ts
    testTimeout: 15000,
  },
});
