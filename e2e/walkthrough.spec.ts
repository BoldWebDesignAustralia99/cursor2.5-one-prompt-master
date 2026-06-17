import { test, type Page } from "@playwright/test";

/**
 * A single continuous walkthrough of the whole app, recorded to video.
 * An on-screen caption banner narrates each section so the video is
 * self-explanatory. Runs entirely on demo data.
 */

async function setPersona(page: Page, persona: string) {
  await page.addInitScript((p) => {
    window.localStorage.setItem("gumbo-demo-persona", p as string);
    window.localStorage.setItem("gumbo-theme", "dark");
  }, persona);
}

/** Inject / update a fixed caption banner (pointer-events:none so it never blocks clicks). */
async function caption(page: Page, title: string, subtitle = "") {
  await page.evaluate(
    ({ title, subtitle }) => {
      let el = document.getElementById("tour-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "tour-caption";
        el.style.cssText = [
          "position:fixed", "top:14px", "left:50%", "transform:translateX(-50%)",
          "z-index:99999", "pointer-events:none", "padding:10px 18px",
          "border-radius:10px", "background:rgba(20,20,23,0.92)",
          "border:1px solid rgba(255,255,255,0.12)", "color:#fafafa",
          "font-family:Inter,system-ui,sans-serif", "box-shadow:0 8px 30px rgba(0,0,0,0.5)",
          "text-align:center", "max-width:80vw",
        ].join(";");
        document.body.appendChild(el);
      }
      el.innerHTML =
        `<div style="font-size:14px;font-weight:600">${title}</div>` +
        (subtitle ? `<div style="font-size:12px;opacity:0.7;margin-top:2px">${subtitle}</div>` : "");
    },
    { title, subtitle },
  );
}

async function beat(page: Page, ms = 900) {
  await page.waitForTimeout(ms);
}

test("guided walkthrough of the entire app", async ({ page }) => {
  // ---------------------------------------------------------------- Super admin
  await setPersona(page, "owner");
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await caption(page, "Gumbo Connect v2", "Enterprise dental-sales platform — signed in as the owner");
  await beat(page, 1600);

  await caption(page, "Command Center", "Today at a glance, money, clinic health, the leaderboard");
  await page.mouse.wheel(0, 200);
  await beat(page);
  await page.mouse.wheel(0, -200);
  await beat(page);

  await caption(page, "Dark / light", "Dark-first, with a light toggle");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await beat(page, 1100);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await beat(page, 700);

  await caption(page, "Command-K", "Jump anywhere from the keyboard");
  await page.keyboard.press("Meta+k");
  await beat(page);
  await page.getByPlaceholder("Jump to…").fill("Performance");
  await beat(page, 700);
  await page.getByRole("option", { name: /Performance/ }).first().click();
  await page.waitForLoadState("networkidle");
  await caption(page, "Performance", "Rep leaderboard + funnels — all from server-side views");
  await beat(page, 1500);

  await page.getByRole("link", { name: "Finances" }).click();
  await caption(page, "Finances", "Credit revenue, payments (Stripe + GoCardless), invoices");
  await beat(page, 1500);

  await page.getByRole("link", { name: "Clinics" }).click();
  await caption(page, "Clinics", "Lifecycle stage, credit balance, paused-in-routing state");
  await beat(page, 1500);

  await page.getByRole("link", { name: "Workflows" }).click();
  await caption(page, "Workflow builder", "Automations as data — triggers, conditions, actions, run logs");
  await beat(page);
  await page.getByText("Showed → enter follow-up").click();
  await beat(page);
  await page.getByRole("button", { name: "Simulate" }).click();
  await beat(page, 1400);

  await page.getByRole("link", { name: "Permissions" }).click();
  await caption(page, "Permissions matrix", "Every page/action is a key — the database is the lock");
  await beat(page, 1600);

  await page.getByRole("link", { name: "System health" }).click();
  await caption(page, "System health", "Integration status + run logs (developer surface)");
  await beat(page, 1500);

  // ------------------------------------------------------------------ Sales rep
  await setPersona(page, "rep");
  await page.goto("/calls");
  await page.waitForLoadState("networkidle");
  await caption(page, "Sales rep — Call queue", "Due callbacks pinned, cadence-ordered leads");
  await beat(page, 1400);

  await page.getByText("Maria Gonzalez").first().click();
  await caption(page, "Focused Call View", "The whole call runs on one screen");
  await beat(page);
  await page.getByRole("button", { name: "Call", exact: true }).click();
  await caption(page, "On the call", "Live timer + recording ring; AI live notes write themselves");
  await beat(page, 1500);

  await page.getByRole("button", { name: /Before\/after photos/ }).click();
  await caption(page, "One-tap SMS", "Per-stage templates fire and auto-log");
  await beat(page, 1200);

  await page.getByPlaceholder("Add a manual note…").fill("Wants to start before the holidays");
  await page.getByRole("button", { name: "Add note" }).click();
  await beat(page, 900);

  await page.getByRole("tab", { name: "Objections" }).click();
  await caption(page, "Objection cue-cards", "Right line, right moment");
  await beat(page, 1300);

  await page.getByText(/min away/).first().click();
  await caption(page, "Match clinic", "Ranked by distance, senior-dentist badge, REC; pick a day & time");
  await beat(page, 1500);

  await page.getByRole("button", { name: /Close, take deposit & book/ }).click();
  await caption(page, "Take the deposit", "Refundable $75 hold — card on call or SMS link");
  await beat(page, 1300);
  await page.getByRole("button", { name: /Take \$75 & book/ }).click();
  await caption(page, "Booked!", "Deposit taken, confetti, on to the next lead");
  await beat(page, 2200);

  // Finance check on a different lead.
  await page.goto("/calls");
  await page.waitForLoadState("networkidle");
  await beat(page, 600);
  await page.getByText("Greg Holloway").first().click();
  await page.getByRole("button", { name: /Finance check/ }).click();
  await caption(page, "Finance check", "Settings-driven thresholds; not eligible → broker referral");
  await beat(page, 1800);
  await page.getByRole("button", { name: /Record result|Mark eligible/ }).click();
  await beat(page, 600);

  // ----------------------------------------------------------- Follow-up rep
  await setPersona(page, "followup");
  await page.goto("/followup");
  await page.waitForLoadState("networkidle");
  await caption(page, "Post-appointment follow-up", "Attended patients worked to a treatment sale");
  await beat(page, 1800);

  // ------------------------------------------------------------- Sales manager
  await setPersona(page, "manager");
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await caption(page, "Sales manager — Floor dashboard", "Team pace + compliance strip");
  await beat(page, 1500);
  await page.goto("/bookings");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Flagged" }).click();
  await caption(page, "Bookings feed", "AI sales-compliance check flags price/finance/deposit gaps");
  await beat(page, 1700);
  await page.goto("/grading");
  await page.waitForLoadState("networkidle");
  await caption(page, "AI call grading", "Weighted rubric, per-category scores, coach in one click");
  await beat(page, 1700);

  // -------------------------------------------------------------- Clinic portal
  await setPersona(page, "clinic");
  await page.goto("/clinic");
  await page.waitForLoadState("networkidle");
  await caption(page, "Clinic portal", "Front desk: incoming patients with the AI booking brief");
  await beat(page, 1400);
  await page.getByRole("tab", { name: /Calendar/ }).click();
  await caption(page, "Calendar management", "Weekly hours + closed/special overrides; no double-booking");
  await beat(page);
  await page.getByRole("button", { name: /Add date override/ }).click();
  await beat(page, 1400);
  await page.getByRole("button", { name: /Save override/ }).click();
  await beat(page, 1000);
  await page.getByRole("tab", { name: /Credits & billing/ }).click();
  await caption(page, "Credits & billing", "Buy credits via GoCardless; numbered invoices");
  await beat(page, 1700);

  // ----------------------------------------------------------------- Mobile
  await caption(page, "Mobile-first", "Same app, optimised for the phone");
  await beat(page, 600);
  await page.setViewportSize({ width: 390, height: 844 });
  await setPersona(page, "rep");
  await page.goto("/calls");
  await page.waitForLoadState("networkidle");
  await caption(page, "Mobile — Call queue", "Bottom nav, touch-friendly");
  await beat(page, 2000);

  await caption(page, "That's Gumbo Connect v2", "Every persona, on one shared architecture — thanks for watching");
  await beat(page, 2200);
});
