import { test, expect } from "@playwright/test";
import { ALL_ROUTES, PERSONAS, loginAs, trackErrors, expectNoErrors } from "./helpers";

// 1) The owner sees every route — exercise each page component at least once.
test.describe("owner visits every route", () => {
  for (const route of ALL_ROUTES) {
    test(`route ${route} renders without errors`, async ({ page }) => {
      const errors = trackErrors(page);
      await loginAs(page, "owner", route);
      // App shell must be present (or a friendly access screen) — never a blank crash.
      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(400);
      await expectNoErrors(errors, `owner ${route}`);
    });
  }
});

// 2) Each persona lands on its home and renders cleanly.
test.describe("each persona boots", () => {
  for (const persona of PERSONAS) {
    test(`${persona} boots at home`, async ({ page }) => {
      const errors = trackErrors(page);
      await loginAs(page, persona, "/");
      await page.waitForTimeout(500);
      // Should not be stuck on /login (demo personas are always "signed in").
      expect(page.url()).not.toContain("/login");
      await expectNoErrors(errors, `${persona} home`);
    });
  }
});

// 3) Persona switching works from the top bar.
test("persona switcher changes the world", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "owner", "/dashboard");
  await page.getByRole("button", { name: /Super admin|Persona/ }).first().click();
  await page.getByText("Sales rep", { exact: true }).click();
  await page.waitForTimeout(400);
  expect(page.url()).toContain("/calls");
  await expectNoErrors(errors, "persona switch");
});
