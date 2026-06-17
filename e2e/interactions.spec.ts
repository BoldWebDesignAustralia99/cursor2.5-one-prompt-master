import { test, expect } from "@playwright/test";
import { loginAs, trackErrors, expectNoErrors } from "./helpers";

test("theme toggle switches dark/light", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "owner", "/dashboard");
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).toHaveClass(/light/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).toHaveClass(/dark/);
  await expectNoErrors(errors, "theme toggle");
});

test("command-K palette opens and navigates", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "owner", "/dashboard");
  await page.keyboard.press("Meta+k");
  await expect(page.getByPlaceholder("Jump to…")).toBeVisible();
  await page.getByPlaceholder("Jump to…").fill("Finances");
  await page.getByRole("option", { name: /Finances/ }).first().click();
  await expect(page).toHaveURL(/\/finances/);
  await expectNoErrors(errors, "command-k");
});

test("focused call view: full booking flow with gates", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/calls");

  // Open the first lead.
  await page.getByText("Maria Gonzalez").first().click();
  await expect(page.getByText("Focused call view")).toBeVisible();

  // Start the call → timer + recording ring appear.
  await page.getByRole("button", { name: "Call", exact: true }).click();
  await expect(page.getByText(/\/ 30:00/)).toBeVisible();

  // Select a clinic to enable booking.
  await page.getByText(/min away/).first().click();

  // Attempt booking → pricing gate (Maria already has pricing provided, so deposit opens).
  await page.getByRole("button", { name: /Close, take deposit & book/ }).click();
  await expect(page.getByRole("heading", { name: "Take deposit & book" })).toBeVisible();
  await page.getByRole("button", { name: /Take \$75 & book/ }).click();

  // Confetti toast confirms the booking.
  await expect(page.getByText(/Booked! Deposit taken\./)).toBeVisible();
  await expectNoErrors(errors, "booking flow");
});

test("focused call view: finance check computes eligibility", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/calls");
  await page.getByText("Tom Whitfield").first().click();
  await page.getByRole("button", { name: /Finance check/ }).click();
  await expect(page.getByText(/Eligible for finance|Not eligible/)).toBeVisible();
  await page.getByRole("button", { name: /Mark eligible|Record result/ }).click();
  await expectNoErrors(errors, "finance check");
});

test("clinic portal: tabs + buy credits + calendar override", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "clinic", "/clinic");
  await page.getByRole("tab", { name: /Calendar/ }).click();
  await expect(page.getByText(/Weekly hours/)).toBeVisible();
  await page.getByRole("button", { name: /Add date override/ }).click();
  await expect(page.getByText(/Closed date blocks the whole day/)).toBeVisible();
  await page.getByRole("button", { name: /Save override/ }).click();
  await expect(page.getByText(/Calendar updated/)).toBeVisible();
  await expectNoErrors(errors, "clinic portal");
});

test("bookings feed: tabs filter", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "manager", "/bookings");
  await page.getByRole("tab", { name: "Flagged" }).click();
  await expect(page.getByText(/No price mentioned/)).toBeVisible();
  await expectNoErrors(errors, "bookings tabs");
});

test("workflows: select, simulate, toggle", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "owner", "/workflows");
  await page.getByText("Showed → enter follow-up").click();
  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(page.getByText(/Simulated against a sample entity/)).toBeVisible();
  await expectNoErrors(errors, "workflows");
});

test("permissions matrix: toggle a key", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "owner", "/permissions");
  await expect(page.getByText("leads.call")).toBeVisible();
  await expectNoErrors(errors, "permissions");
});

test("settings: classification billable toggle", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "owner", "/settings");
  await expect(page.getByText("Classification billable map")).toBeVisible();
  await expectNoErrors(errors, "settings");
});

test("access control: rep is denied finances", async ({ page }) => {
  const errors = trackErrors(page);
  await loginAs(page, "rep", "/finances");
  await expect(page.getByText(/don't have access/)).toBeVisible();
  await expectNoErrors(errors, "rep denied finances");
});
