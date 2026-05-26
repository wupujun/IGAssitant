const { test, expect } = require("@playwright/test");
const path = require("node:path");

test("assistant panel renders on a fixture chat page", async ({ page }) => {
  const fixturePath = path.resolve(__dirname, "fixtures", "assistant-smoke.html");

  await page.goto(`file://${fixturePath}`);

  await expect(page.locator("#igca-root")).toBeVisible();
  await expect(page.locator(".igca-title")).toContainText("Instagram Chat Assistant v0.3.15");
  await expect(page.locator(".igca-draft-input")).toBeVisible();
  await expect(page.locator(".igca-last-message")).toBeVisible();
  await expect(page.locator(".igca-status")).toContainText("API online");
  await expect(page.locator(".igca-status")).toContainText("fixture-model");
});
