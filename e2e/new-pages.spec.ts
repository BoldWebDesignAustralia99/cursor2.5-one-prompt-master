import { test, expect } from "@playwright/test";
import { loginAs, trackErrors, expectNoErrors } from "./helpers";

test("timesheets: one-tap clock in/out", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/timesheets");
  await page.getByRole("button", { name: /Clock in/ }).click();
  await expect(page.getByText("Clocked in")).toBeVisible();
  await page.getByRole("button", { name: /Clock out/ }).click();
  await expect(page.getByText(/timesheet submitted/)).toBeVisible();
  await expectNoErrors(errors, "timesheets");
});

test("tasks: add and complete", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/tasks");
  await page.getByPlaceholder("Add a task…").fill("Test task");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Test task")).toBeVisible();
  await expectNoErrors(errors, "tasks");
});

test("leaderboard renders with streaks", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/leaderboard");
  await expect(page.getByText("This week")).toBeVisible();
  await expect(page.getByText(/Sam Rep/).first()).toBeVisible();
  await expectNoErrors(errors, "leaderboard");
});

test("profile: edit + theme switch", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/profile");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await expectNoErrors(errors, "profile");
});

test("community: post", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/community");
  await page.getByPlaceholder(/Share a win/).fill("Closed a big one!");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByText("Posted to the community")).toBeVisible();
  await expectNoErrors(errors, "community");
});

test("focused call view: objections, manual note, broker referral", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/calls");
  // Greg Holloway is finance not-eligible → broker referral path.
  await page.getByText("Greg Holloway").first().click();
  await expect(page.getByText("Focused call view")).toBeVisible();

  // Objections reference tab.
  await page.getByRole("tab", { name: "Objections" }).click();
  await expect(page.getByText(/talk to my partner/)).toBeVisible();

  // Manual note.
  await page.getByPlaceholder("Add a manual note…").fill("Patient prefers mornings");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Patient prefers mornings")).toBeVisible();

  // Broker referral appears because Greg is not finance-eligible.
  await page.getByRole("button", { name: /Capture broker referral/ }).click();
  await expect(page.getByText(/Broker referral captured/).first()).toBeVisible();

  await expectNoErrors(errors, "call view extras");
});
