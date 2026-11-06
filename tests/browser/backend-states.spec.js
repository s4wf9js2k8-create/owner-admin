import { test, expect } from "@playwright/test";

// Inject an adapter at the module boundary; no production fault switches or URL flags.
async function mountAdapter(page, setup) {
  await page.route("**/src/main.jsx", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `import React from '/owner-admin/node_modules/.vite/deps/react.js';
      import ReactDOM from '/owner-admin/node_modules/.vite/deps/react-dom_client.js';
      import App from '/owner-admin/src/App.jsx';
      import { createFictionalBackend, fictionalFixtures } from '/owner-admin/src/backend/fictional.js';
      import '/owner-admin/src/style.css';
      ${setup}
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, { backend }));`,
    }),
  );
  await page.goto("./");
}
async function navigate(page, name) {
  await page
    .getByRole("button", { name: "Open navigation menu", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test("delayed adapter hides data until load completes", async ({ page }) => {
  await mountAdapter(
    page,
    `let release; const backend = createFictionalBackend({ beforeLoad: () => new Promise(resolve => { release = resolve; }) }); window.releaseDemoLoad = () => release();`,
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Loading fictional demo data" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => window.releaseDemoLoad());
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
});
test("failed adapter load offers recovery", async ({ page }) => {
  await mountAdapter(
    page,
    `let attempts = 0; const backend = createFictionalBackend({ beforeLoad: async () => { if (++attempts === 1) throw new Error('test load failure'); } });`,
  );
  await expect(page.getByRole("alert")).toContainText(
    "Could not load fictional demo data.",
  );
  await page.getByRole("button", { name: "Retry demo load" }).click();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("empty organisations and tickets render useful empty states", async ({
  page,
}) => {
  await mountAdapter(
    page,
    `let first = true; const backend = createFictionalBackend({ fixtures: () => { const data = fictionalFixtures(); data.tickets = []; if (first) { data.orgs = []; data.records = []; first = false; } return data; } });`,
  );
  await expect(
    page.getByText("No example organisations.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset fictional demo" }).click();
  await navigate(page, "Support");
  await expect(page.getByText("No sample ticket selected.")).toBeVisible();
  await page.getByRole("button", { name: "Add example ticket" }).click();
  await expect(page.getByLabel("Ticket status")).toHaveValue("Open");
});
test("failed mutations display an alert and preserve the prior data", async ({
  page,
}) => {
  await mountAdapter(
    page,
    `const backend = createFictionalBackend(); backend.organisations.update = async () => { throw new Error('test write failure'); };`,
  );
  await navigate(page, "Company Profile");
  await page.getByLabel("Account status").selectOption("Suspended");
  await page.getByRole("button", { name: "Confirm sample change" }).click();
  await expect(page.getByRole("alert")).toContainText("Demo change failed");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Account status")).toHaveValue("Trial");
});
test("explicit reset clears records, settings, activity and navigation", async ({
  page,
}) => {
  await page.goto("./");
  await navigate(page, "Settings");
  await page
    .getByRole("checkbox", { name: "Enable customer workspace preview" })
    .uncheck();
  await page.getByRole("button", { name: "Reset fictional demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional demo reset. All session changes cleared."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore customer workspace" }),
  ).toBeEnabled();
  await expect(
    page.getByText("Make a demonstration change to see activity here."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await navigate(page, "Volunteers");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Fictional reset example");
  await page.getByLabel("Profile notes", { exact: true }).fill("Session only");
  await page.getByRole("button", { name: "Save sample person" }).click();
  await expect(
    page.getByText("Fictional reset example", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset fictional demo" }).click();
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await navigate(page, "Volunteers");
  await expect(
    page.getByText("Fictional reset example", { exact: true }),
  ).toHaveCount(0);
});
test("drawer traps keyboard focus and closes after mobile navigation", async ({
  page,
}) => {
  await page.goto("./");
  const open = page.getByRole("button", {
    name: "Open navigation menu",
    exact: true,
  });
  await open.click();
  const nav = page.getByRole("navigation");
  await expect(
    nav.getByRole("button", { name: "Overview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page
      .getByRole("button", { name: "Close navigation menu", exact: true })
      .first(),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    nav.getByRole("button", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
  await navigate(page, "Organisations");
  await expect(open).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#navigation")).toHaveAttribute("inert", "");
  await expect(nav).not.toBeInViewport();
  await expect(
    page.getByRole("heading", { name: "Organisations", exact: true }),
  ).toBeVisible();
});
