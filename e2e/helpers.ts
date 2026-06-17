import { type Page, type ConsoleMessage, expect } from "@playwright/test";

export const PERSONAS = [
  "owner", "rep", "manager", "followup", "clinic", "marketing", "dev",
] as const;

export const ALL_ROUTES = [
  "/dashboard", "/calls", "/followup", "/clinic", "/bookings", "/leads",
  "/clinics", "/performance", "/finances", "/marketing", "/grading",
  "/coaching", "/training", "/hiring", "/approvals", "/staff", "/messages",
  "/workflows", "/permissions", "/system", "/flags", "/settings",
  "/notifications", "/tasks", "/timesheets", "/leaderboard", "/profile",
] as const;

/** Attach console/page-error collectors; returns the error list. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Seed the demo persona before the app boots, then load a route. */
export async function loginAs(page: Page, persona: string, route = "/") {
  await page.addInitScript((p) => {
    window.localStorage.setItem("gumbo-demo-persona", p as string);
    window.localStorage.setItem("gumbo-theme", "dark");
  }, persona);
  await page.goto(route);
}

export async function expectNoErrors(errors: string[], context: string) {
  // Ignore benign network noise (none expected in demo mode) and favicon.
  const real = errors.filter((e) => !e.includes("favicon") && !e.includes("net::ERR"));
  expect(real, `${context} produced console/page errors:\n${real.join("\n")}`).toEqual([]);
}
