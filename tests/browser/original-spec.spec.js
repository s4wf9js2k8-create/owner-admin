import { test, expect } from "@playwright/test";
import { openDestination as nav } from "./navigation.js";
async function mount(page) {
  await page.route("**/src/main.jsx", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
 import React from '/owner-admin/node_modules/.vite/deps/react.js';import ReactDOM from '/owner-admin/node_modules/.vite/deps/react-dom_client.js';import App from '/owner-admin/src/App.jsx';import {createFictionalBackend,fictionalFixtures} from '/owner-admin/src/backend/fictional.js';import '/owner-admin/src/style.css';
 const fixtures=()=>{const s=fictionalFixtures(),o=s.orgs.find(o=>o.id==='demo-engineering');o.modules=[...new Set([...o.modules,'Bookings and appointments','Events & bookings'])];o.modules=o.modules.filter(m=>m!=='Staff communications');s.records.push({id:'spec-driver-qualification',orgId:o.id,module:'Training and qualifications',personId:'demo-engineering-Staff & volunteers-0',qualification:'Specialist driving',title:'Specialist driving',noExpiry:true,approval:'Approved'});s.records.push({id:'spec-parent',orgId:o.id,module:'Tasks & projects',recordType:'task',title:'Original specification deliverable',status:'Planned',approval:'Not requested',ownerId:'demo-engineering-Staff & volunteers-0',owner:'Sample coordinator A',dueDate:'2027-01-05',checklist:[]});return s;};const backend=createFictionalBackend({fixtures});ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App,{backend}));`,
    }),
  );
  await page.goto("./");
}
async function customer(page) {
  await mount(page);
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-engineering");
}
test("resource booking capacity, linked invoice, CRM and cancellation remain consistent", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Bookings and appointments");
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  await page.getByLabel("Resource name").fill("Sample bookable studio");
  await page.getByLabel("Resource capacity").fill("3");
  await page
    .getByRole("combobox", { name: "Reservation model", exact: true })
    .selectOption("Shared capacity");
  await page.getByRole("button", { name: "Add shared resource" }).click();
  await page
    .getByRole("button", { name: "Resource bookings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New resource booking", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Booking title").fill("Sample activity reservation");
  await d
    .getByRole("combobox", { name: "Booking customer", exact: true })
    .selectOption({ index: 1 });
  await d.getByLabel("Booking starts").fill("2026-12-11T09:00");
  await d.getByLabel("Booking ends").fill("2026-12-11T10:00");
  await d
    .getByRole("combobox", { name: "Bookable resource", exact: true })
    .selectOption({ label: "Sample bookable studio · 3 places" });
  await d.getByLabel("Places or units").fill("2");
  await d.getByLabel("Booking unit price (£)").fill("15");
  await d.getByRole("button", { name: "Save resource booking" }).click();
  await expect(d).toHaveCount(0);
  await page
    .locator(".resource-booking-card")
    .filter({ hasText: "Sample activity reservation" })
    .getByRole("button", { name: "Open resource booking" })
    .click();
  await page
    .getByRole("button", { name: "Create resource booking invoice" })
    .click();
  await page.getByRole("button", { name: "Open booking invoice" }).click();
  await expect(page.getByRole("dialog")).toContainText("£30.00");
  await page
    .getByRole("button", { name: "Open resource booking", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel resource booking", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Cancelled");
  await page.getByRole("button", { name: "Open booking invoice" }).click();
  await expect(page.getByRole("dialog")).toContainText("Cancelled");
  await page.getByRole("button", { name: "Open CRM customer" }).click();
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sample activity reservation",
  );
});
test("subtasks block premature completion and staff names follow stable assignments", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Tasks & projects");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Original specification deliverable" })
    .getByRole("button")
    .click();
  await page.getByLabel("Subtask title").fill("Linked preparation");
  await page
    .getByLabel("Subtask assignee")
    .selectOption("Sample coordinator A");
  await page.getByRole("button", { name: "Create subtask" }).click();
  await expect(
    page.getByRole("button", { name: "Linked preparation", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Task status").selectOption("Complete");
  await expect(
    page
      .getByRole("dialog")
      .getByText("Complete the subtasks before finishing this task.", {
        exact: true,
      }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Linked preparation", exact: true })
    .click();
  await page.getByLabel("Task status").selectOption("Complete");
  await page
    .getByRole("button", {
      name: "Open parent: Original specification deliverable",
    })
    .click();
  await page.getByLabel("Task status").selectOption("Complete");
  await expect(page.getByLabel("Task status")).toHaveValue("Complete");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Staff & volunteers");
  await page
    .locator(".people-profile")
    .filter({ hasText: "Sample coordinator A" })
    .getByRole("button", { name: "Open profile" })
    .click();
  await page.getByLabel("Profile name").fill("Renamed fictional coordinator");
  await page.getByRole("button", { name: "Save personal details" }).click();
  await expect(
    page.getByLabel("Sample team member", { exact: true }),
  ).toHaveValue("Renamed fictional coordinator");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Tasks & projects");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Linked preparation" }),
  ).toContainText("Renamed fictional coordinator");
});
test("owner publication reaches companies without communications and withdrawal updates dashboard and notifications", async ({
  page,
}) => {
  await mount(page);
  await nav(page, "Announcements");
  await page.getByLabel("Headline").fill("Fictional platform bulletin");
  await page
    .getByLabel("Message", { exact: true })
    .fill("An operational update");
  await page.getByLabel("Audience").selectOption("Selected companies");
  await page.getByLabel("Relevant companies").selectOption("demo-engineering");
  await page.getByRole("button", { name: "Publish in demo" }).click();
  await nav(page, "Overview");
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-engineering");
  await expect(
    page.getByRole("region", { name: "Channel Systems announcements" }),
  ).toContainText("Fictional platform bulletin");
  await nav(page, "Notifications");
  await expect(page.locator(".notification-inbox")).toContainText(
    "Fictional platform bulletin",
  );
  await page
    .getByRole("button", { name: "Owner console", exact: true })
    .click();
  await nav(page, "Announcements");
  await page
    .locator(".owner-announcement")
    .filter({ hasText: "Fictional platform bulletin" })
    .getByRole("button", { name: "Archive announcement" })
    .click();
  await nav(page, "Overview");
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-engineering");
  await expect(
    page.getByRole("region", { name: "Channel Systems announcements" }),
  ).toHaveCount(0);
  await nav(page, "Notifications");
  await expect(page.locator(".notification-inbox")).not.toContainText(
    "Fictional platform bulletin",
  );
});
test("new document versions require review and recently opened links survive module navigation", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Documents & files");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page
    .getByLabel("Document title")
    .fill("Fictional controlled procedure");
  await page.getByRole("button", { name: "Save document record" }).click();
  await page
    .locator(".document-shelf")
    .getByRole("button")
    .filter({ hasText: "Fictional controlled procedure" })
    .click();
  await page.getByRole("button", { name: "Edit document details" }).click();
  await page.getByLabel("Document title").fill("Revised fictional procedure");
  await page.getByRole("button", { name: "Save document record" }).click();

  await expect(page.getByRole("dialog")).toContainText("Version 2");
  await expect(page.getByRole("dialog")).toContainText(
    "Version 1 · Fictional controlled procedure",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Dashboard");
  await nav(page, "Documents & files");
  await expect(
    page.locator("details").filter({ hasText: "Recently opened documents" }),
  ).toContainText("Revised fictional procedure");
});
test("project briefs, vehicle competency policies and event staffing alerts use current records", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-24T12:00Z"));
  await customer(page);
  await nav(page, "Tasks & projects");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill("Specification project brief");
  await page.getByLabel("Target date").fill("2027-01-05");
  await page.getByLabel("Project lead").selectOption("Sample coordinator A");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .locator(".project-card")
    .filter({ hasText: "Specification project brief" })
    .getByRole("button", { name: "Open project" })
    .click();
  await page
    .getByText("Edit project brief, manager and deadline", { exact: true })
    .click();
  const brief = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save project brief" }) });
  await brief.getByLabel("Project name").fill("Revised specification project");
  await brief.getByLabel("Project deadline").fill("2027-01-12");
  await brief.getByLabel("Project manager").selectOption("Sample colleague B");
  await brief.getByRole("button", { name: "Save project brief" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Revised specification project" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Sample colleague B");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Vehicle / fleet management");
  await page
    .getByRole("button", { name: "Open vehicle checks" })
    .first()
    .click();
  await page.getByText("Assignment requirements", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Required qualification", exact: true })
    .selectOption("Specialist driving");
  await page
    .getByRole("combobox", { name: "Eligible assignment", exact: true })
    .selectOption("demo-engineering-Staff & volunteers-0");
  await page
    .getByRole("button", { name: "Save assignment requirements" })
    .click();
  await page.getByRole("button", { name: "Daily checks", exact: true }).click();
  await expect(
    page
      .getByLabel("Check driver")
      .locator("option")
      .filter({ hasText: "Sample colleague B" }),
  ).toHaveCount(0);
  await expect(
    page
      .getByLabel("Check driver")
      .locator("option")
      .filter({ hasText: "Sample coordinator A" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Events & bookings");
  await page.getByRole("button", { name: "New event", exact: true }).click();
  const event = page.getByRole("dialog");
  await event.getByLabel("Event name").fill("Staffing requirement review");
  await event.getByLabel("Starts", { exact: true }).fill("2026-12-01T09:00");
  await event.getByLabel("Ends", { exact: true }).fill("2026-12-01T10:00");
  await event
    .getByRole("button", { name: "Create event", exact: true })
    .click();
  await page
    .getByText("Ticket categories and event checklist", { exact: true })
    .click();
  await page.getByLabel("Minimum event staff").fill("1");
  await page
    .getByRole("button", { name: "Save event staffing minimum" })
    .click();
  await nav(page, "Notifications");
  await expect(page.locator(".notification-inbox")).toContainText(
    "Event staffing shortfall: Staffing requirement review",
  );
});
test("a new employee moves through qualification, availability, rota, attendance approval and reporting", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-12-07T09:00:00Z"));
  await customer(page);
  const employee = "Fictional integrated employee";
  await nav(page, "Staff & volunteers");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Name", { exact: true }).fill(employee);
  await d.getByLabel("Role", { exact: true }).fill("Engineer");
  await d.getByLabel("Team", { exact: true }).fill("Operations");
  await d.getByRole("button", { name: "Save sample person" }).click();
  await nav(page, "Training and qualifications");
  await page.getByRole("button", { name: "Record qualification" }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Person", exact: true })
    .selectOption(employee);
  await page
    .getByLabel("Qualification", { exact: true })
    .fill("Maintenance engineering");
  await page.getByLabel("Expiry", { exact: true }).fill("2099-12-31");
  await page.getByRole("button", { name: "Save sample record" }).click();
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption("Sample colleague B");
  await page
    .getByRole("button", {
      name: employee + " · Maintenance engineering",
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Approval", exact: true })
    .selectOption("Approved");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Leave and availability");
  await page.getByText("Record available dates", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Availability employee", exact: true })
    .selectOption({ label: employee });
  await page.getByLabel("Available from").fill("2026-12-07");
  await page.getByLabel("Available until").fill("2026-12-11");
  await page.getByRole("button", { name: "Submit available dates" }).click();
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption("Sample coordinator A");
  await page
    .locator(".leave-list article")
    .filter({ hasText: employee })
    .getByRole("button", { name: "Approve", exact: true })
    .click();
  await nav(page, "Staff & volunteers");
  await page
    .locator(".people-profile")
    .filter({ hasText: employee })
    .getByRole("button", { name: "Open profile" })
    .click();
  await page.getByRole("tab", { name: "Schedule", exact: true }).click();
  await page
    .getByLabel("Availability policy")
    .selectOption("Recorded dates only");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Shift rotas");
  await page.getByRole("button", { name: "Add shift", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Start", { exact: true })
    .fill("2026-12-07T09:00");
  await page
    .getByRole("dialog")
    .getByLabel("End", { exact: true })
    .fill("2026-12-07T10:00");
  await page
    .getByRole("dialog")
    .getByLabel("Person", { exact: true })
    .selectOption(employee);
  await page
    .getByRole("dialog")
    .getByLabel("Location", { exact: true })
    .fill("Workshop");
  await page.getByRole("button", { name: "Save sample record" }).click();
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption(employee);
  await nav(page, "Attendance & timesheets");
  await page.getByLabel("Clock-in team member").selectOption(employee);
  await page.getByRole("button", { name: "Clock in", exact: true }).click();
  await page.clock.setFixedTime(new Date("2026-12-07T09:30:00Z"));
  await page
    .locator(".people-time-list article")
    .filter({ hasText: employee })
    .getByRole("button", { name: "Clock out", exact: true })
    .click();
  await page
    .getByLabel("Sample team member", { exact: true })
    .selectOption("Sample coordinator A");
  await page
    .locator(".people-time-list article")
    .filter({ hasText: employee })
    .getByRole("button", { name: "Approve", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: employee }),
  ).toContainText("0.50 h");
  await nav(page, "Reporting");
  await page
    .getByLabel("Report source module")
    .selectOption("Attendance & timesheets");
  await page
    .getByText("People, location and status filters", { exact: true })
    .click();
  await page.getByLabel("Report staff").selectOption({ label: employee });
  await page.getByLabel("Report from date").fill("2026-12-07");
  await page.getByLabel("Report to date").fill("2026-12-07");
  await expect(
    page.getByRole("heading", { name: "0.5 hours", exact: true }),
  ).toBeVisible();
});
