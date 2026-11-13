import { test, expect } from "@playwright/test";
async function open(page) {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-engineering");
}
async function go(page, name) {
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test("leave approval enforces self-review policy and updates engineer eligibility", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption("Sample coordinator A");
  await go(page, "Leave and availability");
  await page
    .getByRole("button", { name: "Request leave", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator("[name=person]")
    .selectOption("Sample coordinator A");
  await page.getByLabel("First day").fill("2027-02-10");
  await page.getByLabel("Last day").fill("2027-02-11");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save sample record" })
    .click();
  await go(page, "Approvals");
  await page
    .locator(".approval-queue button")
    .filter({ hasText: "Sample coordinator A" })
    .filter({ hasText: "Leave request" })
    .last()
    .click();
  await page.getByLabel("Decision reason").fill("Coverage arranged");
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("prevent self-approval");
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption("Sample colleague B");
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Decision saved");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await go(page, "Maintenance & work orders");
  await page
    .getByRole("button", { name: "Raise work order", exact: true })
    .click();
  await page.getByLabel("Due date").fill("2027-02-10");
  await expect(
    page
      .getByLabel("Assigned engineer")
      .locator("option")
      .filter({ hasText: "Sample coordinator A" }),
  ).toHaveCount(0);
});
test("configured failed-inspection automation creates one corrective work order and execution", async ({
  page,
}) => {
  await open(page);
  await go(page, "Automations");
  await page.getByRole("button", { name: "Create automation" }).click();
  await page.getByLabel("Automation name").fill("Inspection repair rule");
  await page.getByRole("button", { name: "Save automation" }).click();
  await go(page, "Inspections");
  await page.getByRole("button", { name: "New inspection" }).click();
  await page.getByLabel("Record title").fill("Automated guard inspection");
  await page.getByRole("button", { name: "Save sample inspection" }).click();
  await page
    .locator(".inspection-row")
    .filter({ hasText: "Automated guard inspection" })
    .getByRole("button", { name: "Inspect", exact: true })
    .click();
  await page.getByLabel("Inspection result").selectOption("Fail");
  await expect(page.getByRole("dialog")).toContainText(
    "Corrective action: Automated guard inspection",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await go(page, "Automations");
  await page.getByRole("button", { name: "Evaluate current records" }).click();
  await expect(page.locator(".admin-workspace")).toContainText("Success");
  await go(page, "Work orders");
  await expect(
    page
      .locator(".job-board-card")
      .filter({ hasText: "Corrective action: Automated guard inspection" }),
  ).toHaveCount(1);
});
test("company settings, scope navigation, dashboard reset, header search and audit are connected", async ({
  page,
}) => {
  await open(page);
  await go(page, "Settings");
  await page
    .getByRole("button", { name: "Company profile", exact: true })
    .click();
  await page
    .getByLabel("Company name", { exact: true })
    .fill("Fictional Configured Engineering");
  await page.getByRole("button", { name: "Save company profile" }).click();
  await expect(page.locator(".topbrand")).toContainText(
    "Fictional Configured Engineering",
  );
  await go(page, "Dashboard");
  await page.getByRole("button", { name: "Customise dashboard" }).click();
  await page
    .getByRole("checkbox", { name: "Qualification expiry", exact: true })
    .check();
  await expect(
    page.getByRole("heading", { name: "Qualification expiry", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset to company template" }).click();
  await expect(
    page.getByRole("heading", { name: "Qualification expiry", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open global search" }).click();
  await page.getByLabel("Search or run a command").fill("Create task");
  await page
    .getByRole("button", { name: "Create a task", exact: true })
    .click();
  await page.getByLabel("Task title").fill("Audit linked task");
  await page
    .getByRole("dialog")
    .getByLabel("Assign to")
    .selectOption("Sample coordinator A");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await go(page, "Activity history");
  await expect(page.locator(".activity-timeline")).toContainText(
    "Audit linked task",
  );
  await page.getByLabel("Simulated customer role").selectOption("Staff");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Automations", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await page
    .getByLabel("Simulated customer role")
    .selectOption("Administrator");
  await go(page, "Activity history");
  await expect(page.locator(".activity-timeline")).toContainText(
    "Audit linked task",
  );
});

test("approved timesheet correction changes weekly hours and viewer writes remain blocked", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption("Sample coordinator A");
  await go(page, "Approvals");
  await page
    .getByRole("button", { name: "Request timesheet correction" })
    .click();
  await page.getByRole("dialog").locator("[name=recordId]").selectOption({
    label: "Afternoon volunteer support · Sample colleague B",
  });
  await page.getByLabel("Corrected start").fill("2026-11-06T09:00");
  await page.getByLabel("Corrected end").fill("2026-11-06T17:00");
  await page.getByRole("dialog").getByLabel("Break minutes").fill("30");
  await page
    .getByLabel("Correction reason")
    .fill("Recorded shift was incomplete");
  await page.getByRole("button", { name: "Submit correction request" }).click();
  await page
    .locator(".approval-queue button")
    .filter({ hasText: "Timesheet correction" })
    .click();
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption("Sample team member A");
  await page.getByLabel("Decision reason").fill("Supervisor verified hours");
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Decision saved");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await go(page, "Attendance & timesheets");
  await page
    .getByRole("button", { name: "Previous timesheet week", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Sample colleague B" }),
  ).toContainText("7.50");
  await page.getByLabel("Simulated customer role").selectOption("Viewer");
  await go(page, "Assets & equipment");
  await page
    .locator(".asset-profile-card")
    .filter({ hasText: "EQ-101" })
    .getByRole("button", { name: "Open asset actions" })
    .click();
  await expect(
    page.getByLabel("Asset condition", { exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Asset condition", { exact: true })
    .evaluate((select) => {
      select.disabled = false;
      select.value = "Out of service";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByLabel("Simulated customer role")
    .selectOption("Administrator");
  await go(page, "Assets & equipment");
  await page
    .locator(".asset-profile-card")
    .filter({ hasText: "EQ-101" })
    .getByRole("button", { name: "Open asset actions" })
    .click();
  await expect(page.getByLabel("Asset condition", { exact: true })).toHaveValue(
    "Good",
  );
});
test("company operating and notification defaults apply without leaking to another company", async ({
  page,
}) => {
  await open(page);
  await go(page, "Settings");
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  await page.getByLabel("Working day starts").fill("10:00");
  await page.getByLabel("Working day ends").fill("18:00");
  await page.getByLabel("Minimum daily shifts").fill("3");
  await page.getByRole("button", { name: "Save operational settings" }).click();
  await go(page, "Shift rotas");
  await expect(page.getByLabel("Minimum shifts per day")).toHaveValue("3");
  await expect(page.locator(".rota-planner")).toContainText("10:00–18:00");
  await go(page, "Settings");
  await page
    .locator(".admin-tabs")
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await page.getByLabel("Default reminder days").fill("21");
  await page
    .getByRole("button", { name: "Save notification defaults" })
    .click();
  await go(page, "Notifications");
  await page.getByRole("button", { name: "Notification preferences" }).click();
  await expect(page.getByLabel("Reminder period in days")).toHaveValue("21");
  await page.getByLabel("Example workspace").selectOption("demo-charity");
  await go(page, "Shift rotas");
  await expect(page.getByLabel("Minimum shifts per day")).toHaveValue("1");
});
