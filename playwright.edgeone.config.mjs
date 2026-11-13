import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-edgeone",
  timeout: 60000,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "artifacts/edgeone-test-report", open: "never" }]],
  outputDir: "artifacts/edgeone-test-results",
  use: {
    baseURL: "http://127.0.0.1:4178",
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build:edgeone && node scripts/serve.mjs --port 4178 --dir artifacts/edgeone-pages --headers edgeone.json",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: false,
    env: { DEPLOY_MODE: "preview", SITE_URL: "" },
  },
});
