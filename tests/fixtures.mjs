import { test as base, expect } from "@playwright/test";

// UI checks use the saved release; real HTTP integration is tested separately.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/data-config.js*", route => route.fulfill({
      contentType: "text/javascript",
      body: 'window.DATA_CONFIG = Object.freeze({source:"local",apiBase:"",timeoutMs:5000});',
    }));
    await use(page);
  },
});
export { expect };
