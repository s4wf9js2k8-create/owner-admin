import { test, expect } from "@playwright/test";
async function go(page, name) {
  await page
    .getByRole("button", { name: "Open navigation menu", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
async function open(page, finance = false) {
  await page.goto("./");
  if (finance) {
    await go(page, "Modules");
    await page
      .getByLabel("Organisation", { exact: true })
      .selectOption("demo-visitor");
    await page.getByRole("checkbox", { name: /^Quotes and invoices/ }).check();
    await go(page, "Overview");
  }
  await page
    .getByRole("button", { name: "Explore customer workspace", exact: true })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-visitor");
}
async function event(
  page,
  title = "Fictional connected open day",
  staff = false,
) {
  await go(page, "Events & bookings");
  await page.getByRole("button", { name: "New event", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Event name", { exact: true }).fill(title);
  await dialog.getByLabel("Starts", { exact: true }).fill("2026-12-16T10:00");
  await dialog.getByLabel("Ends", { exact: true }).fill("2026-12-16T12:00");
  await dialog.getByLabel("Capacity", { exact: true }).fill("3");
  if (staff) {
    await dialog
      .getByLabel("Assigned staff", { exact: true })
      .selectOption("demo-visitor-Staff & volunteers-0");
    await dialog
      .getByLabel("Equipment and resources", { exact: true })
      .selectOption("demo-visitor-Assets & equipment-0");
  }
  await dialog
    .getByRole("button", { name: "Create event", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}
async function reserve(page, title, guests, price = 0) {
  await page.getByLabel("Attendee or group", { exact: true }).fill(title);
  await page.getByLabel("Places", { exact: true }).fill(String(guests));
  await page
    .getByLabel("Unit price (£, fictional)", { exact: true })
    .fill(String(price));
  await page
    .getByRole("button", { name: "Reserve places", exact: true })
    .click();
}
test("event delivery links staffing, resources, preparation tasks, rota, staff profile and global search", async ({
  page,
}) => {
  await open(page);
  await event(page, undefined, true);
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await page
    .getByLabel("Preparation task")
    .fill("Prepare fictional visitor welcome");
  await page
    .getByLabel("Responsible team member")
    .selectOption("demo-visitor-Staff & volunteers-0");
  await page.getByRole("button", { name: "Create linked task" }).click();
  await expect(page.locator(".schedule-notice").first()).toContainText(
    "Preparation task linked",
  );
  await go(page, "Shift rotas");
  await page.getByLabel("Rota week containing").fill("2026-12-16");
  await expect(page.locator(".rota-linked-allocations")).toContainText(
    "Fictional connected open day",
  );
  await page
    .locator(".rota-linked-allocations")
    .getByRole("button")
    .filter({ hasText: "Fictional connected open day" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Fictional connected open day",
      exact: true,
    }),
  ).toBeVisible();
  await go(page, "Staff & volunteers");
  await page
    .locator(".people-profile")
    .filter({ hasText: "Sample coordinator A" })
    .getByRole("button", { name: "Open profile" })
    .click();
  await page.getByRole("tab", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Fictional connected open day",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await go(page, "Assets & equipment");
  await page
    .locator(".asset-profile-card")
    .filter({ hasText: "Workshop compressor" })
    .getByRole("button", { name: "Open asset actions" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Fictional connected open day",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Open global search" }).click();
  await page
    .getByPlaceholder("Search everything, or type a command…")
    .fill("Fictional connected open day");
  await page
    .locator(".command-results")
    .getByRole("button")
    .filter({ hasText: "Fictional connected open day" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Fictional connected open day",
      exact: true,
    }),
  ).toBeVisible();
});
test("capacity, waiting list, check-in, cancellation, booking invoice and customer history stay connected", async ({
  page,
}) => {
  await open(page, true);
  await event(page);
  await page.getByRole("button", { name: "Booking desk", exact: true }).click();
  await reserve(page, "Fictional commercial group", 3, 12.5);
  await expect(page.locator(".schedule-notice").first()).toContainText(
    "Booking confirmed",
  );
  await reserve(page, "Waiting fictional group", 1);
  await expect(page.locator(".schedule-notice").first()).toContainText(
    "waitlist",
  );
  const row = page
    .getByRole("row")
    .filter({ hasText: "Fictional commercial group" });
  await row
    .getByLabel("Booking status for Fictional commercial group")
    .selectOption("Checked in");
  await expect(page.locator(".event-capacity-strip")).toContainText(
    "3 checked in",
  );
  await row.getByRole("button", { name: "Create booking invoice" }).click();
  await expect(page.getByRole("dialog")).toContainText("£37.50");
  await expect(page.getByRole("dialog")).toContainText("Example Co A");
  await page.getByRole("button", { name: "Open CRM customer" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Booking invoice: Fictional commercial group",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await go(page, "Events & bookings");
  await page.getByRole("button", { name: "Booking desk", exact: true }).click();
  await page
    .getByLabel("Choose event")
    .selectOption({ label: "Fictional connected open day — 2026-12-16 10:00" });
  await page
    .getByLabel("Booking status for Fictional commercial group")
    .selectOption("Cancelled");
  await expect(page.locator(".event-capacity-strip")).toContainText(
    "3 available · 0 checked in",
  );
  await page
    .getByLabel("Booking status for Waiting fictional group")
    .selectOption("Confirmed");
  await expect(page.locator(".event-capacity-strip")).toContainText(
    "1 confirmed places of 3",
  );
  await go(page, "Reporting");
  await page
    .getByLabel("Report source module")
    .selectOption("Events & bookings");
  await page.getByLabel("Report measure").selectOption("places");
  await page.getByLabel("Report from date").fill("2026-12-16");
  await page.getByLabel("Report to date").fill("2026-12-16");
  await expect(
    page
      .getByLabel("Report results")
      .getByRole("heading", { name: "1 places", exact: true }),
  ).toBeVisible();
});
test("event equipment cannot be reserved by a conflicting appointment", async ({
  page,
}) => {
  await open(page);
  await event(page, undefined, true);
  await go(page, "Bookings and appointments");
  await page
    .getByRole("button", { name: "Book appointment", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Appointment title")
    .fill("Conflicting equipment consultation");
  await dialog
    .getByLabel("Customer", { exact: true })
    .selectOption("demo-visitor-Customers / CRM-0");
  await dialog.getByLabel("Start", { exact: true }).fill("2026-12-16T10:30");
  await dialog.getByLabel("End", { exact: true }).fill("2026-12-16T11:30");
  await expect(
    dialog
      .getByLabel("Staff member")
      .getByRole("option", { name: /Sample coordinator A/ }),
  ).toHaveCount(0);
  await dialog
    .getByLabel("Staff member")
    .selectOption("demo-visitor-Staff & volunteers-1");
  await dialog
    .getByLabel("Reserved resources")
    .selectOption("demo-visitor-Assets & equipment-0");
  await dialog.getByRole("button", { name: "Save appointment" }).click();
  await expect(dialog.getByRole("alert")).toContainText("already reserved");
  await dialog.getByLabel("Start", { exact: true }).fill("2026-12-16T12:00");
  await dialog.getByLabel("End", { exact: true }).fill("2026-12-16T13:00");
  await dialog.getByRole("button", { name: "Save appointment" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .locator(".schedule-appointment")
      .filter({ hasText: "Conflicting equipment consultation" }),
  ).toBeVisible();
});
test("appointments can be rescheduled, completed and produce a single customer follow-up task", async ({
  page,
}) => {
  await open(page);
  await go(page, "Bookings and appointments");
  await page
    .getByRole("button", { name: "Book appointment", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Appointment title")
    .fill("Fictional design consultation");
  await dialog
    .getByLabel("Customer", { exact: true })
    .selectOption("demo-visitor-Customers / CRM-0");
  await dialog.getByLabel("Start", { exact: true }).fill("2026-12-17T09:00");
  await dialog.getByLabel("End", { exact: true }).fill("2026-12-17T10:00");
  await dialog
    .getByLabel("Staff member")
    .selectOption("demo-visitor-Staff & volunteers-0");
  await dialog.getByRole("button", { name: "Save appointment" }).click();
  await page
    .locator(".schedule-appointment")
    .filter({ hasText: "Fictional design consultation" })
    .getByRole("button", { name: "Manage" })
    .click();
  await dialog.getByRole("button", { name: "Reschedule appointment" }).click();
  await dialog.getByLabel("Start", { exact: true }).fill("2026-12-17T11:00");
  await dialog.getByLabel("End", { exact: true }).fill("2026-12-17T12:00");
  await dialog.getByRole("button", { name: "Save appointment" }).click();
  await page
    .locator(".schedule-appointment")
    .filter({ hasText: "Fictional design consultation" })
    .getByRole("button", { name: "Manage" })
    .click();
  await dialog
    .getByLabel("Appointment outcome")
    .fill("Agreed fictional next steps");
  await dialog
    .getByRole("button", { name: "Complete appointment", exact: true })
    .click();
  await expect(dialog).toContainText("Agreed fictional next steps");
  await dialog.getByRole("button", { name: "Create follow-up task" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Follow up: Fictional design consultation",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await go(page, "Customers / CRM");
  await page
    .locator(".crm-company")
    .filter({ hasText: "Example Co A" })
    .getByRole("button", { name: "Open customer" })
    .click();
  await dialog.getByRole("button", { name: "Tasks", exact: true }).click();
  await expect(dialog).toContainText(
    "Follow up: Fictional design consultation",
  );
  await dialog
    .getByRole("button", { name: "Bookings & appointments", exact: true })
    .click();
  await expect(dialog).toContainText("Fictional design consultation");
});
test("CRM contacts, local calls, assigned follow-ups and quotation context use stable customer links", async ({
  page,
}) => {
  await open(page, true);
  await go(page, "Customers / CRM");
  await page.getByRole("button", { name: "Add company", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Company name").fill("Fictional Harbour Visits");
  await dialog.getByRole("button", { name: "Create company" }).click();
  await page
    .locator(".crm-company")
    .filter({ hasText: "Fictional Harbour Visits" })
    .getByRole("button", { name: "Open customer" })
    .click();
  await dialog.getByRole("button", { name: "Contacts", exact: true }).click();
  await dialog
    .getByLabel("Contact name", { exact: true })
    .fill("Sample fictional organiser");
  await dialog.getByLabel("Contact email").fill("organiser@example.invalid");
  await dialog.getByRole("button", { name: "Save contact" }).click();
  await expect(dialog.locator(".crm-contact")).toContainText(
    "Sample fictional organiser",
  );
  await dialog.getByRole("button", { name: "Activity", exact: true }).click();
  await dialog.getByLabel("Activity type").selectOption("Call");
  await dialog
    .getByLabel("What happened?")
    .fill("Discussed a fictional group visit");
  await dialog.getByRole("button", { name: "Add activity" }).click();
  await expect(dialog.locator(".crm-timeline")).toContainText(
    "Discussed a fictional group visit",
  );
  await dialog.getByRole("button", { name: "Tasks", exact: true }).click();
  await dialog
    .getByLabel("Follow-up task", { exact: true })
    .fill("Prepare fictional visit proposal");
  await dialog
    .getByLabel("Assigned employee")
    .selectOption("demo-visitor-Staff & volunteers-0");
  await dialog.getByRole("button", { name: "Create customer task" }).click();
  await expect(dialog).toContainText("Prepare fictional visit proposal");
  await dialog
    .getByRole("button", { name: "Quotes & invoices", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Start customer quotation" })
    .click();
  await expect(
    dialog.getByLabel("Customer", { exact: true }).locator("option:checked"),
  ).toHaveText("Fictional Harbour Visits");
  await dialog
    .getByLabel("Selected contact")
    .selectOption({ label: "Sample fictional organiser" });
  await dialog.getByLabel("Item 1", { exact: true }).fill("Group visit");
  await dialog.getByLabel("Unit price (£)", { exact: true }).fill("25");
  await dialog.getByRole("button", { name: "Save draft quotation" }).click();
  await expect(
    page
      .locator(".quote-document")
      .filter({ hasText: "Fictional Harbour Visits" }),
  ).toContainText("£25.00");
});
test("shared resource registry and calendar work by keyboard and reset removes session reservations", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Open navigation menu", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Events", exact: true }),
  ).toHaveCount(0);
  const group = page.getByRole("button", {
    name: "Toggle BUSINESS & RESOURCES navigation",
    exact: true,
  });
  await group.focus();
  await page.keyboard.press("Enter");
  await expect(group).toHaveAttribute("aria-expanded", "false");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Events & bookings", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(group).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bookings and appointments", exact: true })
    .click();
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  await page.getByLabel("Resource name").fill("Fictional quiet meeting room");
  await page.getByRole("button", { name: "Add shared resource" }).click();
  await expect(page.locator(".schedule-resource-list")).toContainText(
    "Fictional quiet meeting room",
  );
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  await page.getByLabel("Calendar view").selectOption("Day");
  await page.getByLabel("Calendar date").fill("2026-12-18");
  await expect(
    page.locator(".schedule-calendar-grid.schedule-day"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Book appointment", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reset fictional demo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore customer workspace", exact: true })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-visitor");
  await go(page, "Bookings and appointments");
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  await expect(page.locator(".schedule-resource-list")).not.toContainText(
    "Fictional quiet meeting room",
  );
});
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
});

test("maintenance customer selection opens the linked CRM history", async ({
  page,
}) => {
  await open(page);
  await go(page, "Maintenance");
  await page.getByRole("button", { name: "Raise work order" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Record title")
    .fill("Fictional customer site repair");
  await dialog
    .getByLabel("Customer (optional)")
    .selectOption("demo-visitor-Customers / CRM-0");
  await dialog.getByLabel("Due date").fill("2026-12-20");
  await dialog
    .getByLabel("Assigned engineer")
    .selectOption("Sample coordinator A");
  await dialog.getByRole("button", { name: "Save sample work order" }).click();
  await page
    .locator(".job-board-card")
    .filter({ hasText: "Fictional customer site repair" })
    .getByRole("button", { name: "Manage work order" })
    .click();
  await dialog
    .getByRole("button", { name: "Open work-order customer" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Fictional customer site repair",
  );
});
