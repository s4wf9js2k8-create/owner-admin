import { openDestination } from "./navigation.js";
import { test, expect } from "@playwright/test";
async function enter(page, id = "demo-engineering") {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption(id);
}
const nav = openDestination;
const overflow = async (page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
test("archive and restore retain completed attendance history, links and CSV rows", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Business archives");
  await page.getByLabel("Archive view").selectOption("Eligible active records");
  await page
    .locator(".archive-card")
    .filter({ hasText: "Afternoon volunteer support" })
    .getByRole("button", { name: "Review historical record" })
    .click();
  await page
    .getByLabel("Archive reason")
    .fill("Superseded certificate retained for history");
  await page
    .getByRole("button", { name: "Archive record", exact: true })
    .click();
  await page.getByLabel("Archive view").selectOption("Archived");
  const card = page
    .locator(".archive-card")
    .filter({ hasText: "Afternoon volunteer support" });
  await expect(card).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export archive CSV" }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe("business-archive.csv");
  await card.getByRole("button", { name: "Review historical record" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Superseded certificate",
  );
  await page.getByRole("button", { name: "Restore record" }).click();
  await expect(card).toHaveCount(0);
  await page.getByLabel("Archive view").selectOption("Eligible active records");
  await expect(card).toBeVisible();
  await overflow(page);
});
test("published linked form creates corrective maintenance and versioned asset response", async ({
  page,
}) => {
  await enter(page, "demo-heritage");
  await nav(page, "Forms and surveys");
  await page
    .getByLabel("Form name", { exact: true })
    .fill("Equipment defect report");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Mobile defect findings");
  await page.getByRole("button", { name: "Create form", exact: true }).click();
  await page
    .getByLabel("Workflow action")
    .selectOption("Defect to maintenance");
  await page.getByLabel("Question or label").fill("Fault description");
  await page.getByLabel("Answer type").selectOption("Long text");
  await page.getByLabel("Required field", { exact: true }).check();
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  await page.getByRole("button", { name: "Publish form", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete form", exact: true })
    .click();
  await page.getByLabel("Related business record").selectOption({ index: 1 });
  await page
    .getByLabel("Fault description", { exact: true })
    .fill("Guard fastening missing");
  await page.getByRole("button", { name: "Submit response" }).click();
  await expect(
    page.getByText("Form response submitted in this demo."),
  ).toBeVisible();
  await page.locator(".form-response summary").first().click();
  await expect(page.locator(".form-response")).toContainText(
    "Guard fastening missing",
  );
  await page
    .getByRole("button", { name: "Open generated maintenance" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Guard fastening missing",
  );
  await overflow(page);
});
test("training session assessments create pending qualifications and downloadable local evidence", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Training and qualifications");
  await page
    .getByText("Training sessions and assessments", { exact: true })
    .click();
  await page.getByLabel("Session title").fill("Renewal workshop");
  await page.getByLabel("Qualification awarded").fill("Precision measurement");
  await page.getByLabel("Session date and time").fill("2026-12-10T10:00");
  await page.getByLabel("Sample coordinator A", { exact: true }).check();
  await page.getByRole("button", { name: "Schedule training session" }).click();
  await page
    .getByRole("combobox", { name: "Sample coordinator A", exact: true })
    .selectOption("Pass");
  await page.getByLabel("Certificate expiry").fill("2028-12-10");
  await page.getByLabel("Local evidence", { exact: false }).setInputFiles({
    name: "certificate.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Fictional certificate"),
  });
  await page.getByRole("button", { name: "Save assessment results" }).click();
  await expect(
    page.getByText(
      "Assessment saved. Passed qualifications are now in the competency matrix awaiting approval.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Sample coordinator A · Precision measurement · Awaiting approval",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Local certificate evidence" }),
  ).toBeVisible();
  await overflow(page);
});
test("safety risk scoring and corrective action share a maintenance record", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Health & safety");
  await page.getByRole("button", { name: "Report safety concern" }).click();
  await page.getByLabel("Concern title").fill("Workshop barrier hazard");
  await page
    .getByLabel("What happened or could happen?")
    .fill("Damaged barrier exposes moving equipment");
  await page
    .getByLabel("Reported by")
    .selectOption({ label: "Sample coordinator A" });
  await page.getByRole("button", { name: "Save safety report" }).click();
  await page.getByLabel("Who may be affected?").fill("Workshop staff");
  await page.getByLabel("Likelihood (1–5)").fill("3");
  await page.getByLabel("Severity (1–5)").fill("4");
  await page.getByLabel("Existing controls").fill("Area isolated");
  await page
    .getByLabel("Required corrective action")
    .fill("Repair and verify barrier");
  await page.getByLabel("Review date", { exact: true }).fill("2026-12-10");
  await page
    .getByLabel("Responsible staff")
    .selectOption({ label: "Sample colleague B" });
  await page.getByRole("button", { name: "Save risk assessment" }).click();
  await expect(page.getByText("Risk assessment saved.")).toBeVisible();
  await page.getByLabel("Action type").selectOption("maintenance");
  await page.getByLabel("Action deadline", { exact: true }).fill("2030-01-01");
  await expect(
    page
      .getByLabel("Assigned employee")
      .getByRole("option", { name: "Sample coordinator A", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Eligibility exclusions", { exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(/expired/i);
  await page.getByLabel("Action deadline", { exact: true }).fill("2027-04-01");
  await page
    .getByLabel("Assigned employee")
    .selectOption({ label: "Sample coordinator A" });
  await page.getByLabel("Related asset").selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Create corrective work", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Safety action: Workshop barrier hazard · Planned",
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Repair and verify barrier",
  );
  await overflow(page);
});
test("fundraising campaign targets, donor links and reconciliation update connected contributions", async ({
  page,
}) => {
  await enter(page, "demo-charity");
  await nav(page, "Donations and fundraising");
  await page.getByText("Create fundraising campaign", { exact: true }).click();
  await page.getByLabel("Campaign name").fill("Access fund");
  await page.getByLabel("Fundraising purpose").fill("Improve community access");
  await page.getByLabel("Campaign target (£)").fill("500");
  await page
    .getByRole("button", { name: "Create campaign", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record donation", exact: true })
    .click();
  await page
    .getByLabel("Donation campaign")
    .selectOption({ label: "Access fund" });
  await page.getByLabel("Existing donor").selectOption({ index: 1 });
  await page.getByLabel("Amount (£, fictional)", { exact: true }).fill("125");
  await page
    .getByLabel("Donation reference", { exact: true })
    .fill("SAMPLE-125");
  await page.getByRole("button", { name: "Save donation" }).click();
  await expect(
    page.locator(".purpose-card").filter({ hasText: "Access fund" }),
  ).toContainText("£125.00 of £500.00 target");
  await page
    .getByLabel("Contribution campaign")
    .selectOption({ label: "Access fund" });
  await page.getByRole("button", { name: "Open donation" }).click();
  await page
    .getByLabel("Reconciliation reference")
    .fill("Fictional bank match");
  await page.getByRole("button", { name: "Mark reconciled" }).click();
  await expect(page.getByRole("dialog")).toContainText("Fictional bank match");
  await page.getByRole("button", { name: "Open donor profile" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await overflow(page);
});
test("visitor figures calculate category and period totals without adding event counts twice", async ({
  page,
}) => {
  await enter(page, "demo-visitor");
  await nav(page, "Visitor statistics");
  await page.getByText("Record visitor figures", { exact: true }).click();
  await page.getByLabel("Count date").fill("2026-12-03");
  await page.getByLabel("Count category").selectOption("Child");
  await page.getByLabel("Visitor count", { exact: true }).fill("17");
  await page.getByRole("button", { name: "Save visitor figures" }).click();
  await page.getByLabel("Visitor period from").fill("2026-12-01");
  await page.getByLabel("Visitor period to").fill("2026-12-31");
  await page
    .getByRole("combobox", { name: "Visitor category", exact: false })
    .selectOption("Child");
  await expect(
    page.getByRole("heading", { name: "17 recorded visitors" }),
  ).toBeVisible();
  await expect(page.locator(".visitor-bars")).toContainText("17");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export visitor CSV" }).click();
  expect((await dl).suggestedFilename()).toBe("visitor-counts.csv");
  await overflow(page);
});

test("asset purchase controls and locally generated QR open the exact profile", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Assets & equipment");
  await page
    .locator(".asset-profile-card")
    .first()
    .getByRole("button", { name: "Open asset actions" })
    .click();
  await page
    .getByText("Purchase, warranty and asset label", { exact: true })
    .click();
  await page.getByLabel("Purchase date", { exact: true }).fill("2025-05-12");
  await page.getByLabel("Purchase cost (£)").fill("850");
  await page.getByLabel("Purchase reference").fill("DEMO-PO-42");
  await page.getByRole("button", { name: "Save purchase details" }).click();
  await expect(
    page.getByText("Asset purchase and warranty details saved."),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /QR code opening/ }),
  ).toBeVisible();
  const url = await page
    .getByRole("link", { name: "Open mobile asset profile" })
    .getAttribute("href");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download asset QR label" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.svg$/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto(url);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Equipment", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await overflow(page);
});
test("operational templates prepare recurring checks once per date", async ({
  page,
}) => {
  await enter(page, "demo-visitor");
  await nav(page, "Daily operations");
  await page
    .getByText("Recurring opening and closing check templates", { exact: true })
    .click();
  await page
    .getByLabel("Template title", { exact: true })
    .fill("Unlock visitor entrance");
  await page
    .getByLabel("Template staff member")
    .selectOption({ label: "Sample coordinator A" });
  await page
    .getByLabel("Template instructions")
    .fill("Unlock entrance and verify access");
  await page.getByRole("button", { name: "Save recurring template" }).click();
  await page
    .getByLabel("Generate from template")
    .selectOption({ label: "Unlock visitor entrance" });
  await page.getByLabel("First occurrence").fill("2026-12-01");
  await page.getByLabel("Last occurrence").fill("2026-12-03");
  await page.getByLabel("Repeat every").selectOption("1");
  await page
    .getByRole("button", { name: "Generate scheduled occurrences" })
    .click();
  await expect(
    page.getByText(
      "Occurrences generated. Existing dates were retained without duplicates.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate scheduled occurrences" })
    .click();
  await page.getByLabel("Operational date").fill("2026-12-02");
  await expect(
    page.locator(".daily-check").filter({ hasText: "Unlock visitor entrance" }),
  ).toHaveCount(1);
  await overflow(page);
});
test("owner package editor updates allowances, add-on totals and subscription period balances", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Subscriptions");
  await page
    .getByText("Edit package pricing, allowances and add-ons", { exact: true })
    .click();
  const packageName = await page.getByLabel("Package to edit").inputValue();
  await page.getByLabel("Monthly package price (£)").fill("100");
  await page.getByLabel("Package user allowance", { exact: true }).fill("12");
  await page.getByLabel("Included package modules").selectOption([]);
  await page
    .getByText("Optional add-on monthly prices", { exact: true })
    .click();
  await page
    .getByLabel("Vehicle / fleet management (£ / month)", { exact: true })
    .fill("15");
  await page.getByRole("button", { name: "Save package changes" }).click();
  await expect(
    page.getByText(/Package edited\. Existing operational records/),
  ).toBeVisible();
  await page
    .getByText("Company add-ons and subscription period ledger", {
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", { name: /Vehicle \/ fleet management · £15.00/ })
    .check();
  await page.getByRole("button", { name: "Apply company add-ons" }).click();
  await expect(
    page.getByText(/Add-on pricing and module access updated/),
  ).toBeVisible();
  await page.getByLabel("Billing period starts").fill("2026-12-01");
  await page.getByLabel("Billing period ends").fill("2026-12-31");
  await page
    .getByRole("button", { name: "Record illustrative billing period" })
    .click();
  await expect(page.locator(".owner-package-editor")).toContainText(
    packageName,
  );
  await expect(page.locator(".owner-package-editor")).toContainText(
    "£115.00 expected",
  );
  await page.getByLabel("Billing period starts").fill("2026-12-15");
  await page.getByLabel("Billing period ends").fill("2027-01-15");
  await page
    .getByRole("button", { name: "Record illustrative billing period" })
    .click();
  await expect(
    page.getByText("Subscription billing periods must not overlap."),
  ).toBeVisible();
  await overflow(page);
});

test("editing an inspection template advances its version and retains the previous questions", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Inspections");
  await page.getByRole("button", { name: "Build inspection template" }).click();
  await page
    .getByLabel("Template name", { exact: true })
    .fill("Initial safety worksheet");
  await page.getByRole("button", { name: "Add inspection question" }).click();
  await page
    .getByLabel("Question text", { exact: true })
    .fill("Original guard question");
  await page
    .getByRole("button", { name: "Save inspection template", exact: true })
    .click();
  const edit = page
    .locator(".inspection-template-tools")
    .getByRole("button", { name: /^Edit / })
    .first();
  await edit.click();
  const before = await page
    .getByLabel("Question text", { exact: true })
    .first()
    .inputValue();
  await page
    .getByLabel("Template name", { exact: true })
    .fill("Revised routine inspection");
  await page
    .getByLabel("Question text", { exact: true })
    .first()
    .fill("Revised safety question");
  await page
    .getByRole("button", { name: "Save inspection template", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Edit Revised routine inspection · v2",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByText("Inspection template version history", { exact: true })
    .click();
  await expect(page.locator(".inspection-template-tools")).toContainText(
    before,
  );
  await expect(page.locator(".inspection-template-tools")).toContainText(
    "Version 1",
  );
  await overflow(page);
});
