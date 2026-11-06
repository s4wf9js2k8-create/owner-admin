import { test, expect } from "@playwright/test";
async function navigate(page, name) {
  await page
    .getByRole("button", { name: "Open navigation menu", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("./");
});
test("organisation creation, search, edit, archive and refresh reset", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "+ Add example organisation" })
    .click();
  await page
    .getByRole("textbox", { name: "Organisation name" })
    .fill("Fictional Test Workshop");
  await page
    .getByRole("combobox", { name: "Sector", exact: true })
    .selectOption("engineering");
  await page.getByRole("button", { name: "Save example organisation" }).click();
  await expect(
    page.getByRole("heading", { name: "Fictional Test Workshop" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page
    .getByRole("textbox", { name: "Organisation name" })
    .fill("Renamed Sample Works");
  await page.getByRole("button", { name: "Save example organisation" }).click();
  await page.getByLabel("Account status").selectOption("Archived");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Account status")).toHaveValue("Trial");
  await page.getByLabel("Account status").selectOption("Archived");
  await page.getByRole("button", { name: "Confirm sample change" }).click();
  await navigate(page, "Organisations");
  await page
    .getByRole("textbox", { name: "Search organisations" })
    .fill("Renamed");
  await expect(
    page.getByRole("row").filter({ hasText: "Renamed Sample Works" }),
  ).toContainText("Archived");
  await page.getByLabel("Filter organisation status").selectOption("Active");
  await expect(
    page.getByText("No organisations match your search."),
  ).toBeVisible();
  await page.reload();
  await navigate(page, "Organisations");
  await page
    .getByRole("textbox", { name: "Search organisations" })
    .fill("Renamed");
  await expect(
    page.getByText("No organisations match your search."),
  ).toBeVisible();
});
test("customer modules are interactive and session records remain scoped", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await navigate(page, "Volunteers");
  await page.getByRole("button", { name: "New directory" }).click();
  await page.getByLabel("Record title").fill("Sample isolated volunteer");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Fictional welcome team");
  await page.getByRole("button", { name: "Create sample record" }).click();
  await page.getByRole("button", {name:"View Sample isolated volunteer"}).click();
  await page.getByLabel("Record status").selectOption("Complete");
  await expect(page.getByLabel("Record status")).toHaveValue("Complete");
  await page.getByRole("button", {name:"Close dialog"}).click();
  await page
    .getByLabel("Example workspace", { exact: true })
    .selectOption("demo-charity");
  await navigate(page, "Volunteers");
  await expect(
    page.getByText("Sample isolated volunteer", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Example workspace", { exact: true })
    .selectOption("demo-engineering");
  await navigate(page, "Work orders");
  await expect(
    page.getByText("Replace pump seal", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Example workspace", { exact: true })
    .selectOption("demo-visitor");
  await navigate(page, "Visitor statistics");
  await expect(
    page.getByText("184 sample visitors", { exact: true }),
  ).toBeVisible();
});
test("module dependencies, package confirmations and support history", async ({
  page,
}) => {
  await navigate(page, "Modules");
  await page.getByRole("checkbox", { name: /^Volunteers/ }).uncheck();
  await expect(
    page.getByRole("checkbox", { name: /^Attendance & Hours/ }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: /^Attendance & Hours/ }).check();
  await expect(
    page.getByRole("checkbox", { name: /^Volunteers/ }),
  ).toBeChecked();
  await navigate(page, "Subscriptions");
  await page
    .getByRole("combobox", { name: "Package", exact: true })
    .selectOption("Starter");
  await page.getByRole("button", { name: "Confirm sample change" }).click();
  await expect(
    page.getByText("Illustrative fee: £25 / month", { exact: false }),
  ).toBeVisible();
  await navigate(page, "Support");
  await page.getByLabel("Ticket status").selectOption("Closed");
  await page
    .getByLabel("Fictional message")
    .fill("Fictional request reviewed.");
  await page.getByRole("button", { name: "Add local entry" }).click();
  await expect(
    page.getByText("Fictional request reviewed.", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Activity Logs");
  await expect(
    page.getByRole("cell", {
      name: "Changed sample package to Starter",
      exact: true,
    }),
  ).toBeVisible();
});
test("keyboard menu, modal focus, page errors and responsive overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const menu = page.getByRole("button", {
    name: "Open navigation menu",
    exact: true,
  });
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await page
    .getByRole("button", { name: "+ Add example organisation" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Organisation name" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "+ Add example organisation" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/overview-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
