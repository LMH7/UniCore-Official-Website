import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/test-report", open: "never" }],
  ],
  outputDir: "artifacts/test-results",
  use: {
    baseURL: "http://127.0.0.1:4175",
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve.mjs --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: !process.env.CI,
  },
});
