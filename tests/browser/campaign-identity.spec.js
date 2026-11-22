import { test, expect } from "@playwright/test";
async function nav(page, name) {
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test("editing a campaign preserves the independent retained fundraising module", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-charity");
  await nav(page, "Donations and fundraising");
  const modern = page
    .locator(".purpose-card")
    .filter({
      has: page.getByRole("heading", { name: "General fund", exact: true }),
    });
  await modern.getByRole("button", { name: "Edit campaign" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Target (£)", { exact: true })
    .fill("4200");
  await page
    .getByRole("button", { name: "Save campaign", exact: true })
    .click();
  await expect(
    page.getByText("Campaign updated.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(modern).toContainText("£4200.00 target");
  await nav(page, "Donations");
  await expect(
    page
      .locator(".purpose-card")
      .filter({
        has: page.getByRole("heading", { name: "General fund", exact: true }),
      }),
  ).toContainText("£2500.00 target");
  await nav(page, "Donations and fundraising");
  await expect(modern).toContainText("£4200.00 target");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
