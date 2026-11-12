import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-backend",
  timeout: 30000,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "artifacts/backend-test-report", open: "never" }]],
  outputDir: "artifacts/backend-test-results",
  use: {
    baseURL: "http://127.0.0.1:4180",
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    headless: true, trace: "retain-on-failure",
  },
  webServer: [{
    command: "node scripts/backend-task.mjs preview --port 4180",
    url: "http://127.0.0.1:4180/healthz",
    reuseExistingServer: false,
    env: { ALLOWED_ORIGINS: "https://lmh7.github.io,http://127.0.0.1:4181" },
  }, {
    command: "node scripts/serve.mjs --port 4181",
    url: "http://127.0.0.1:4181",
    reuseExistingServer: false,
  }],
});
