import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173",
    viewport: { width: 1366, height: 768 },
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
