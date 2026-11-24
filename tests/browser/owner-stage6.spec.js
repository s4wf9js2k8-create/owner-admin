import { openDestination } from "./navigation.js";
import { test, expect } from "@playwright/test";
const go = openDestination;
async function finishWizard(page, welcome = "Fictional configured welcome") {
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Next step" }).click();
  await page.getByLabel("Welcome message", { exact: true }).fill(welcome);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Next step" }).click();
  await page
    .getByRole("button", { name: "Create fictional workspace", exact: true })
    .click();
  await expect(
    page.locator(".owner-onboarding").getByRole("status"),
  ).toContainText("Fictional company created");
}
test("guided onboarding creates the actual workspace with selected branding and reset restores state", async ({
  page,
}) => {
  await page.goto("./");
  await go(page, "Onboarding");
  await page
    .getByLabel("Fictional company name", { exact: true })
    .fill("Fictional Stage Six Company");
  await finishWizard(page);
  await page
    .getByRole("button", { name: "Open new customer workspace" })
    .click();
  await expect(page.locator(".topbrand")).toContainText(
    "Fictional Stage Six Company",
  );
  await expect(page.locator(".customer-shell")).toContainText(
    "Fictional configured welcome",
  );
  await page
    .getByRole("button", { name: "Owner console", exact: true })
    .click();
  await go(page, "Organisations");
  await expect(
    page
      .locator(".owner-company-entry")
      .filter({ hasText: "Fictional Stage Six Company" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Reset fictional demo" }).click();
  await go(page, "Organisations");
  await expect(
    page
      .locator(".owner-company-entry")
      .filter({ hasText: "Fictional Stage Six Company" }),
  ).toHaveCount(0);
});
test("won sales lead transfers to onboarding and links to one company", async ({
  page,
}) => {
  await page.goto("./");
  await go(page, "Sales Leads");
  await page.getByLabel("Company", { exact: true }).fill("Fictional Won Lead");
  await page
    .getByLabel("Contact", { exact: true })
    .fill("Example lead contact");
  await page.getByRole("button", { name: "Add prospect" }).click();
  await page.getByLabel("Stage for Fictional Won Lead").selectOption("Won");
  await page
    .locator(".purpose-card")
    .filter({ hasText: "Fictional Won Lead" })
    .getByRole("button", { name: "Convert to onboarding draft" })
    .click();
  await expect(
    page.getByLabel("Fictional company name", { exact: true }),
  ).toHaveValue("Fictional Won Lead");
  await expect(page.getByLabel("Contact person", { exact: true })).toHaveValue(
    "Example lead contact",
  );
  await finishWizard(page);
  await go(page, "Sales Leads");
  const lead = page
    .locator(".purpose-card")
    .filter({ hasText: "Fictional Won Lead" });
  await lead.getByRole("button", { name: "Open converted company" }).click();
  await expect(
    page.getByRole("heading", { name: "Fictional Won Lead", exact: true }),
  ).toBeVisible();
  await go(page, "Organisations");
  await expect(
    page
      .locator(".owner-company-entry")
      .filter({ hasText: "Fictional Won Lead" }),
  ).toHaveCount(1);
});
test("support creation assignment notes and resolution update inbox and metrics", async ({
  page,
}) => {
  await page.goto("./");
  await go(page, "Support");
  await page
    .getByRole("button", { name: "Create support ticket", exact: true })
    .click();
  await page.getByLabel("Ticket subject").fill("Fictional Stage Six Support");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Configuration assistance");
  await page.getByLabel("Initial priority").selectOption("Urgent");
  await page
    .getByRole("button", { name: "Create ticket", exact: true })
    .click();
  await page
    .getByLabel("Assigned support person", { exact: true })
    .selectOption("Fictional support agent");
  await page.getByLabel("Fictional message").fill("Checked configuration");
  await page.getByRole("button", { name: "Add local entry" }).click();
  await page
    .getByLabel("Resolution information")
    .fill("Fictional configuration corrected");
  await page
    .getByRole("button", { name: "Resolve ticket", exact: true })
    .click();
  await expect(page.getByLabel("Ticket status")).toHaveValue("Resolved");
  await expect(page.locator(".owner-support")).toContainText(
    "Checked configuration",
  );
  await page.getByText("Supported response metrics", { exact: true }).click();
  await expect(page.locator(".owner-support")).toContainText(
    "Average recorded resolution",
  );
  await page.getByRole("button", { name: "Reopen ticket" }).click();
  await expect(page.getByLabel("Ticket status")).toHaveValue("Open");
});
test("feature requests and roadmap share development status", async ({
  page,
}) => {
  await page.goto("./");
  await go(page, "Feature Requests");
  await page
    .getByLabel("Feature description")
    .fill("Fictional roadmap connection");
  await page.getByRole("button", { name: "Add request", exact: true }).click();
  const row = page
    .locator(".owner-request-row")
    .filter({ hasText: "Fictional roadmap connection" });
  await row.getByRole("button", { name: "Vote +1" }).click();
  await page
    .getByLabel("Request status for Fictional roadmap connection")
    .selectOption("Planned");
  await go(page, "Product Roadmap");
  const card = page
    .locator(".owner-roadmap article")
    .filter({ hasText: "Fictional roadmap connection" });
  await card.getByLabel("Development status").selectOption("Testing");
  await go(page, "Feature Requests");
  await expect(
    page.getByLabel("Request status for Fictional roadmap connection"),
  ).toHaveValue("Testing");
});
test("branding affects selected company only", async ({ page }) => {
  await page.goto("./");
  await go(page, "Branding Templates");
  await page
    .getByLabel("Organisation", { exact: true })
    .selectOption("demo-engineering");
  await page.getByLabel("Brand accent colour").fill("#754b7e");
  await page
    .getByLabel("Customer welcome message")
    .fill("Fictional company-specific welcome");
  await page
    .getByRole("button", { name: "Apply to fictional company" })
    .click();
  await page
    .getByRole("button", { name: "Open selected customer workspace" })
    .click();
  await expect(page.locator(".customer-shell")).toContainText(
    "Fictional company-specific welcome",
  );
  await page.getByLabel("Example workspace").selectOption("demo-charity");
  await expect(page.locator(".customer-shell")).not.toContainText(
    "Fictional company-specific welcome",
  );
});
test("owner role hides restricted navigation and denies forced company creation", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Simulated owner role").selectOption("Support Agent");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Modules", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Support", exact: true })
    .click();
  const create = page.getByRole("button", {
    name: "+ Add example organisation",
  });
  await create.evaluate((b) => (b.disabled = false));
  await create.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Simulated owner role").selectOption("Platform Owner");
  await go(page, "Organisations");
  await expect(page.locator(".owner-company-entry")).toHaveCount(4);
});
test("package creation and assignment applies included module dependencies", async ({
  page,
}) => {
  await page.goto("./");
  await go(page, "Subscriptions");
  await page
    .getByText("Create a standard or bespoke package", { exact: true })
    .click();
  await page
    .getByLabel("Package name", { exact: true })
    .fill("Fictional Bespoke Package");
  await page.getByLabel("Monthly illustrative price (£)").fill("89");
  await page.getByLabel("Annual illustrative price (£)").fill("890");
  await page.getByLabel("Included modules").selectOption("Inventory and stock");
  await page
    .getByRole("button", { name: "Create package", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Package", exact: true })
    .selectOption("Fictional Bespoke Package");
  await page.getByRole("button", { name: "Confirm sample change" }).click();
  await expect(
    page.getByText("Illustrative fee: £89 / month", { exact: false }),
  ).toBeVisible();
  await go(page, "Modules");
  await expect(
    page.getByRole("checkbox", { name: /^Inventory and stock/ }),
  ).toBeChecked();
});
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
});
test("owner announcement drafts publish only to the selected customer workspace and can be archived", async ({
  page,
}) => {
  await page.goto("./");
  await go(page, "Announcements");
  await page.getByLabel("Headline").fill("Fictional targeted release");
  await page
    .getByLabel("Message", { exact: true })
    .fill("New fictional workflow available");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByLabel("Audience").selectOption("Selected companies");
  await page.getByLabel("Relevant companies").selectOption("demo-engineering");
  await page.getByRole("button", { name: "Publish in demo" }).click();
  await go(page, "Organisations");
  await page
    .locator(".owner-company-entry")
    .filter({ hasText: "Northbank Engineering" })
    .getByRole("button", { name: "Preview", exact: true })
    .click();
  await go(page, "Staff communications");
  await expect(page.locator(".communications-workspace")).toContainText(
    "Fictional targeted release",
  );
  await page.getByLabel("Example workspace").selectOption("demo-charity");
  await go(page, "Staff communications");
  await expect(page.locator(".communications-workspace")).not.toContainText(
    "Fictional targeted release",
  );
  await page
    .getByRole("button", { name: "Owner console", exact: true })
    .click();
  await go(page, "Announcements");
  await page
    .locator(".owner-announcement")
    .filter({ hasText: "Fictional targeted release" })
    .getByRole("button", { name: "Archive announcement" })
    .click();
  await go(page, "Organisations");
  await page
    .locator(".owner-company-entry")
    .filter({ hasText: "Northbank Engineering" })
    .getByRole("button", { name: "Preview", exact: true })
    .click();
  await go(page, "Staff communications");
  await expect(page.locator(".communications-workspace")).not.toContainText(
    "Fictional targeted release",
  );
});
test("owner layout and business defaults update during the session and reset consistently", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Customise business dashboard" })
    .click();
  await page
    .getByRole("checkbox", { name: "Module adoption", exact: true })
    .uncheck();
  await expect(
    page.getByRole("heading", { name: "Module adoption", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Reset business layout" }).click();
  await expect(
    page.getByRole("heading", { name: "Module adoption", exact: true }),
  ).toBeVisible();
  await go(page, "Settings");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Channel Systems Demo Business");
  await page
    .getByLabel("Default onboarding package")
    .selectOption("Professional");
  await page.getByRole("button", { name: "Save business settings" }).click();
  await go(page, "Overview");
  await expect(
    page.getByRole("heading", {
      name: "Channel Systems Demo Business",
      exact: true,
    }),
  ).toBeVisible();
  await go(page, "Onboarding");
  await page
    .getByLabel("Fictional company name", { exact: true })
    .fill("Fictional default package");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByLabel("Configured package")).toHaveValue(
    "Professional",
  );
  await page.getByRole("button", { name: "Reset fictional demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Business control centre", exact: true }),
  ).toBeVisible();
});
