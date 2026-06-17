import { defineConfig, devices } from "@playwright/test";

/** Dedicated config that records a single, watchable walkthrough video. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "walkthrough.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1440, height: 900 },
    video: { mode: "on", size: { width: 1440, height: 900 } },
    launchOptions: { slowMo: 300 }, // slow actions so the video is easy to follow
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
