import { test } from "@playwright/test";
import { loginAs } from "./helpers";

const shots: { persona: string; route: string; name: string; prep?: (p: import("@playwright/test").Page) => Promise<void> }[] = [
  { persona: "owner", route: "/dashboard", name: "01-command-center" },
  { persona: "rep", route: "/calls", name: "02-call-queue" },
  {
    persona: "rep", route: "/calls", name: "03-focused-call",
    prep: async (p) => {
      await p.getByText("Maria Gonzalez").first().click();
      await p.getByRole("button", { name: "Call", exact: true }).click();
      await p.getByText(/min away/).first().click();
      await p.waitForTimeout(300);
    },
  },
  { persona: "followup", route: "/followup", name: "04-followup-board" },
  { persona: "clinic", route: "/clinic", name: "05-clinic-portal" },
  { persona: "manager", route: "/bookings", name: "06-bookings-feed" },
  { persona: "owner", route: "/workflows", name: "07-workflows" },
  { persona: "owner", route: "/permissions", name: "08-permissions" },
  { persona: "owner", route: "/performance", name: "09-performance" },
  { persona: "manager", route: "/dashboard", name: "10-floor-dashboard" },
];

for (const s of shots) {
  test(`shot ${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, s.persona, s.route);
    await page.waitForTimeout(500);
    if (s.prep) await s.prep(page);
    await page.screenshot({ path: `.artifacts/${s.name}.png`, fullPage: true });
  });
}

test("shot mobile call queue", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, "rep", "/calls");
  await page.waitForTimeout(400);
  await page.screenshot({ path: ".artifacts/11-mobile-call-queue.png", fullPage: true });
});

test("shot light dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.setItem("gumbo-demo-persona", "owner");
    window.localStorage.setItem("gumbo-theme", "light");
  });
  await page.goto("/dashboard");
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".artifacts/12-light-command-center.png", fullPage: true });
});
