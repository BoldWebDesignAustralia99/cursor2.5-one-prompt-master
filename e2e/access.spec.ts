import { test, expect } from "@playwright/test";
import { loginAs, trackErrors, expectNoErrors } from "./helpers";

test("clinic user is scoped to the portal (no internal nav)", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "clinic", "/");
  await expect(page).toHaveURL(/\/clinic/);
  // Internal nav must not be present.
  await expect(page.getByRole("link", { name: "Finances" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Workflows" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Performance" })).toHaveCount(0);
  // The portal entry is present.
  await expect(page.getByRole("link", { name: "My clinics" })).toBeVisible();
  await expectNoErrors(errors, "clinic scope");
});

test("clinic user is denied the internal dashboard by direct URL", async ({ page }) => {
  await loginAs(page, "clinic", "/dashboard");
  await expect(page.getByText(/don't have access/)).toBeVisible();
});

test("marketing has no calling surface", async ({ page }) => {
  await loginAs(page, "marketing", "/");
  await expect(page.getByRole("link", { name: "Call queue" })).toHaveCount(0);
  // Direct URL to calls is denied at the route layer.
  await loginAs(page, "marketing", "/calls");
  await expect(page.getByText(/don't have access/)).toBeVisible();
});

test("developer has no calling surface", async ({ page }) => {
  await loginAs(page, "dev", "/calls");
  await expect(page.getByText(/don't have access/)).toBeVisible();
});
