import { test, expect } from "@playwright/test";
async function open(page) {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-engineering");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Inventory and stock", exact: true })
    .click();
}
test("stock returns and transfers update quantities and location balances", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Add stock item" }).click();
  await page.getByLabel("Item name", { exact: true }).fill("Connected bearing");
  await page.getByLabel("SKU", { exact: true }).fill("BR-42");
  await page.getByLabel("Opening quantity").fill("10");
  await page.getByLabel("Storage location").fill("Main store");
  await page.getByRole("button", { name: "Save stock item" }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Connected bearing" })
    .getByRole("button", { name: "Stock movement" })
    .click();
  await page.getByLabel("Stock operation").selectOption("Allocate");
  await page.getByLabel("Allocate to work order").selectOption({ index: 1 });
  await page.getByLabel("Quantity", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Record stock movement" }).click();
  await expect(page.getByRole("dialog")).toContainText("6 units");
  await page.getByLabel("Stock operation").selectOption("Return");
  await page.getByLabel("Allocate to work order").selectOption({ index: 1 });
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Record stock movement" }).click();
  await expect(page.getByRole("dialog")).toContainText("8 units");
  await page.getByLabel("Stock operation").selectOption("Transfer");
  await page.getByLabel("Destination location").fill("Workshop");
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Record stock movement" }).click();
  await expect(page.getByRole("dialog")).toContainText("Workshop: 3");
  await expect(page.getByRole("dialog")).toContainText("8 units");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("supplier purchase delivery completes an order", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Suppliers", exact: true }).click();
  await page.getByRole("button", { name: "Add supplier" }).click();
  await page.getByLabel("Supplier name").fill("Fictional Supplier");
  await page.getByRole("button", { name: "Save supplier" }).click();
  await page
    .getByRole("button", { name: "Purchase orders", exact: true })
    .click();
  await page.getByRole("button", { name: "Create purchase order" }).click();
  await page.getByLabel("Order reference").fill("PO-42");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Order quantity").fill("3");
  await page.getByLabel("Expected delivery").fill("2027-03-01");
  await page.getByRole("button", { name: "Save purchase order" }).click();
  const po = page.locator(".purchase-order-card").filter({ hasText: "PO-42" });
  await po.getByLabel("Delivery quantity").fill("3");
  await po.getByRole("button", { name: "Record delivery" }).click();
  await expect(po).toContainText("3 of 3 delivered");
  await expect(po).toContainText("Complete");
});
test("document versions and local files remain linked to the selected asset", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Documents & files", exact: true })
    .click();
  await page.getByRole("button", { name: "Add document" }).click();
  await page.getByLabel("Document title").fill("Connected asset manual");
  const asset = page
      .getByLabel("Related records (select multiple)")
      .locator("option")
      .filter({ hasText: "Assets" })
      .first(),
    id = await asset.getAttribute("value");
  await page.getByLabel("Related records (select multiple)").selectOption(id);
  await page
    .getByLabel("Local file (optional, up to 2 MB)")
    .setInputFiles({
      name: "manual.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Fictional manual"),
    });
  await page.getByRole("button", { name: "Save document record" }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Connected asset manual" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("manual.txt");
  await page.getByRole("button", { name: "Edit document details" }).click();
  await page.getByLabel("Document title").fill("Revised asset manual");
  await page.getByRole("button", { name: "Save document record" }).click();
  await expect(page.getByRole("dialog")).toContainText("Version 2");
  await page
    .getByRole("dialog")
    .getByRole("button")
    .filter({ hasText: "Assets" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Revised asset manual");
});
