import { test, expect } from "@playwright/test";
import { openDestination as nav } from "./navigation.js";
async function mount(page) {
  await page.route("**/src/main.jsx", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    import React from '/owner-admin/node_modules/.vite/deps/react.js';
    import ReactDOM from '/owner-admin/node_modules/.vite/deps/react-dom_client.js';
    import App from '/owner-admin/src/App.jsx';
    import {createFictionalBackend,fictionalFixtures} from '/owner-admin/src/backend/fictional.js';
    import {financialTotals} from '/owner-admin/src/financialRules.js';
    import '/owner-admin/src/style.css';
    const fixture=()=>{const s=fictionalFixtures(),o=s.orgs.find(o=>o.id==='demo-engineering');
      o.modules=[...new Set([...o.modules,'Quotes and invoices','Archives and collections','Events & bookings','Customers / CRM','Training and qualifications','Inspections & checklists'])];
      s.records=s.records.filter(r=>r.orgId!==o.id);
      const add=r=>s.records.push({orgId:o.id,...r});
      ['Alex Example','Blair Example','Casey Reviewer'].forEach((title,i)=>{
        add({id:'person'+i,module:'Staff & volunteers',title,employmentStatus:'Active',team:'Operations',role:'Team member'});
        ['Safety inspection','Vehicle driving','Maintenance engineering'].forEach(q=>add({id:'q'+i+q,module:'Training and qualifications',personId:'person'+i,person:title,title:q,qualification:q,noExpiry:true,approval:'Approved'}));
      });
      add({id:'asset',module:'Assets & equipment',title:'Sample press',asset:'PRESS-001',condition:'Good',location:'Workshop'});
      ['09:00','13:00'].forEach((time,i)=>add({id:'shift'+i,module:'Shift rotas',title:'Exchange shift '+i,personId:'person'+i,person:['Alex Example','Blair Example'][i],startTime:'2026-12-01T'+time,endTime:'2026-12-01T'+(i?'17:00':'12:00'),location:'Workshop',status:'Planned'}));
      add({id:'customer',module:'Customers / CRM',title:'Example Customer Ltd',company:'Example Customer Ltd',stage:'Customer'});
      add({id:'paid',module:'Quotes and invoices',title:'INV-FINAL',reference:'INV-FINAL',recordType:'invoice',customerId:'customer',creationDate:'2026-11-20',dueDate:'2026-12-20',documentStatus:'Issued',lineItems:[{description:'Service',quantity:1,rate:100,vat:0}],totals:financialTotals([{description:'Service',quantity:1,rate:100,vat:0}]),payments:[{id:'payment',date:'2026-11-20',amountPence:10000,reference:'Fictional settlement'}],credits:[]});
      add({id:'inspection',module:'Inspections & checklists',title:'Press guard check',assetId:'asset',asset:'Sample press',inspectorId:'person0',inspector:'Alex Example',dueDate:'2026-12-01',status:'Planned',result:'Pending',inspectionQuestions:[{id:'guard',label:'Guard secure',section:'Safety',type:'Pass / fail',required:true}],templateName:'Press safety'});
      add({id:'attendance',module:'Attendance & timesheets',title:'Morning session',personId:'person0',person:'Alex Example',startTime:'2026-11-20T09:00',endTime:'2026-11-20T12:00',breakMinutes:0,approval:'Approved',location:'Workshop'});
      return s;};
    const backend=createFictionalBackend({fixtures:fixture});
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App,{backend}));
  `,
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
test("qualified coverage and a supervisor-reviewed exchange update both shifts", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Shift rotas");
  await page
    .getByText("Qualified staffing requirements", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Required competency", exact: true })
    .selectOption("Vehicle driving");
  await page.getByLabel("Minimum qualified staff").fill("2");
  await page.getByLabel("Required from").fill("09:00");
  await page.getByLabel("Required until").fill("17:00");
  await page.getByRole("button", { name: "Save staffing requirement" }).click();
  await page.getByLabel("Rota week containing").fill("2026-12-01");
  await expect(page.getByText(/COVERAGE SHORTFALL/).first()).toBeVisible();
  await page
    .locator(".rota-assignment")
    .filter({ hasText: "Exchange shift 0" })
    .first()
    .click();
  await page.getByLabel("Swap with shift").selectOption("shift1");
  await page.getByLabel("Swap reason").fill("Cover change");
  await page.getByRole("button", { name: "Request shift exchange" }).click();
  await page.getByLabel("Decision reason").fill("Checked availability");
  await page.getByRole("button", { name: "Record swap decision" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "self-approval" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Sample team member").selectOption("Casey Reviewer");
  await page
    .locator(".rota-assignment")
    .filter({ hasText: "Exchange shift 0" })
    .first()
    .click();
  await page.getByLabel("Decision reason").fill("Both dates checked");
  await page.getByRole("button", { name: "Record swap decision" }).click();
  await expect(page.getByRole("dialog")).toContainText("Approved");
  await expect(page.getByLabel("Reassign shift")).toHaveValue("Blair Example");
});
test("recurring inspections preserve the source and avoid duplicate dates", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Inspections & checklists");
  await page
    .locator(".inspection-row")
    .filter({ hasText: "Press guard check" })
    .getByRole("button")
    .first()
    .click();
  await page
    .getByText("Schedule recurring inspections", { exact: true })
    .click();
  await page.getByLabel("Inspection recurrence starts").fill("2026-12-08");
  await page.getByLabel("Inspection recurrence ends").fill("2026-12-15");
  await page
    .getByRole("button", { name: "Generate inspection schedule" })
    .click();
  await expect(
    page.getByText("Inspection schedule generated.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate inspection schedule" })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.locator(".inspection-row").filter({ hasText: "Press guard check" }),
  ).toHaveCount(3);
});
test("catalogue lines keep prices and paid invoice corrections are refunded explicitly", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Quotes and invoices");
  await page
    .getByText("Products, services and illustrative tax defaults", {
      exact: true,
    })
    .click();
  await page.getByLabel("Product/service code").fill("LABOUR");
  await page.getByLabel("Product/service name").fill("Workshop labour");
  await page.getByLabel("Unit catalogue price (£)").fill("75");
  await page.getByRole("button", { name: "Add catalogue item" }).click();
  await expect(
    page.getByText("Product/service added.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Build quote", exact: true }).click();
  await page
    .getByLabel("Add product/service to document")
    .selectOption({ index: 1 });
  await expect(page.getByRole("dialog")).toContainText("£90.00");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("tab", { name: "Invoices", exact: true }).click();
  await page
    .locator(".quote-document")
    .filter({ hasText: "INV-FINAL" })
    .getByRole("button")
    .first()
    .click();
  await page
    .getByText("Invoice correction and fictional refunds", { exact: true })
    .click();
  const credit = page.locator("form").filter({
    has: page.getByRole("button", {
      name: "Record invoice correction",
      exact: true,
    }),
  });
  await credit.getByLabel("Correction amount (£)").fill("40");
  await credit.getByLabel("Reason and reference").fill("Service correction");
  await credit.getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Credit balance available for refund £40.00",
  );
  const refund = page.locator("form").filter({
    has: page.getByRole("button", {
      name: "Record fictional refund",
      exact: true,
    }),
  });
  await refund.getByLabel("Refund amount (£)").fill("40");
  await refund.getByLabel("Reason and reference").fill("Illustrative return");
  await refund.getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Outstanding balance: £0.00",
  );
  await expect(page.getByRole("dialog")).toContainText("Illustrative return");
});
test("ticket reservations check in individual visitors and release capacity on cancellation", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Events & bookings");
  await page.getByRole("button", { name: "New event", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Event name").fill("Sample ticketed session");
  await dialog.getByLabel("Starts", { exact: true }).fill("2026-12-03T10:00");
  await dialog.getByLabel("Ends", { exact: true }).fill("2026-12-03T12:00");
  await dialog.getByLabel("Capacity", { exact: true }).fill("2");
  await dialog
    .getByRole("button", { name: "Create event", exact: true })
    .click();
  await page
    .getByText("Ticket categories and event checklist", { exact: true })
    .click();
  await page.getByLabel("Ticket category name").fill("Standard");
  await page.getByLabel("Category price (£)").fill("12");
  await page.getByLabel("Category capacity").fill("2");
  await page.getByRole("button", { name: "Add ticket category" }).click();
  await page.getByLabel("Event preparation check").fill("Room ready");
  await page.getByRole("button", { name: "Add event check" }).click();
  await page.getByRole("checkbox", { name: "Room ready" }).check();
  await page.getByRole("button", { name: "Booking desk", exact: true }).click();
  await page
    .getByLabel("Attendee or group", { exact: true })
    .fill("Example party");
  await page
    .getByRole("combobox", { name: "Ticket category", exact: true })
    .selectOption({ index: 1 });
  await page.getByLabel("Places", { exact: true }).fill("2");
  await page
    .getByLabel("Individual attendee names")
    .fill("Taylor Example\nMorgan Example");
  await page
    .getByRole("button", { name: "Reserve places", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Example party" });
  await row.getByText("Individual attendees (2)", { exact: true }).click();
  await row
    .getByRole("button", { name: "Check in Taylor Example", exact: true })
    .click();
  await expect(row).toContainText("Undo check-in for Taylor Example");
  await row
    .getByRole("button", { name: "Check in Morgan Example", exact: true })
    .click();
  await expect(row.getByLabel("Booking status for Example party")).toHaveValue(
    "Checked in",
  );
  await row
    .getByLabel("Booking status for Example party")
    .selectOption("Cancelled");
  await expect(page.locator(".schedule-notice").first()).toContainText(
    "cancelled",
  );
  await expect(page.getByText(/2 available/)).toBeVisible();
});
test("historical accession preserves provenance and can be found by reference", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Archives and collections");
  await page.getByRole("button", { name: "Accession item" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Collection title").fill("Sample workshop ledger");
  await d.getByLabel("Collection reference").fill("COL-001");
  await d.getByLabel("Collection category", { exact: true }).fill("Ledgers");
  await d.getByLabel("Physical storage location").fill("Cabinet A");
  await d
    .getByLabel("Description", { exact: true })
    .fill("Fictional historical record");
  await d.getByLabel("Provenance").fill("Example accession register");
  await d.getByLabel("Historical date", { exact: true }).fill("1950-01-01");
  await d.getByRole("button", { name: "Save collection record" }).click();
  await page.getByLabel("Search collection").fill("COL-001");
  await expect(
    page.getByText("Sample workshop ledger", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View collection item" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Example accession register",
  );
});
test("custom owner accounts use editable page restrictions and retain the owner escape route", async ({
  page,
}) => {
  await mount(page);
  await nav(page, "Owner Access");
  await page.getByLabel("Custom owner role name").fill("Sample support desk");
  await page.getByLabel("Owner role template").selectOption("Support Agent");
  await page
    .getByRole("button", { name: "Create owner role", exact: true })
    .click();
  await page
    .getByLabel("Edit owner permission role")
    .selectOption("Sample support desk");
  const card = page
    .locator(".completion-entry")
    .filter({ has: page.getByText("Product Roadmap", { exact: true }) });
  await card.getByLabel("Hide page").check();
  await page
    .getByRole("button", { name: "Save owner permission matrix" })
    .click();
  await page.getByLabel("Owner account name").fill("Sample Agent");
  await page.getByLabel("Fictional owner email").fill("sample@example.invalid");
  await page
    .getByRole("combobox", { name: "Owner account role", exact: true })
    .selectOption("Sample support desk");
  await page
    .getByRole("button", { name: "Create owner account record" })
    .click();
  await page
    .getByLabel("Fictional owner account", { exact: true })
    .selectOption({ label: "Sample Agent · Sample support desk" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Product Roadmap", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Support", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Fictional owner account", { exact: true })
    .selectOption("");
  await nav(page, "Owner Access");
  await expect(
    page.getByRole("heading", { name: "Owner accounts and permission matrix" }),
  ).toBeVisible();
});
test("attendance correction from its source page retains original hours until independent approval", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Attendance & timesheets");
  await page
    .getByRole("button", { name: "Review / correct", exact: true })
    .click();
  await page
    .getByText("Request attendance correction", { exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Corrected clock-out").fill("2026-11-20T13:00");
  await d.getByLabel("Correction reason").fill("Verified extended session");
  await d
    .getByRole("button", { name: "Submit attendance correction", exact: true })
    .click();
  await expect(d).toContainText(
    "original attendance is retained until approval",
  );
  await expect(d.getByLabel("endTime", { exact: true })).toHaveValue(
    "2026-11-20T12:00",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Sample team member").selectOption("Casey Reviewer");
  await nav(page, "Approvals");
  await page
    .locator(".approval-queue button")
    .filter({ hasText: "Timesheet correction" })
    .click();
  await page.getByLabel("Decision reason").fill("Checked actual hours");
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Decision saved");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Attendance & timesheets");
  await page
    .getByRole("button", { name: "Review / correct", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("endTime", { exact: true }),
  ).toHaveValue("2026-11-20T13:00");
});
test("person restrictions affect navigation and widget reset clears per-widget filters", async ({
  page,
}) => {
  await customer(page);
  await nav(page, "Staff & volunteers");
  await page
    .locator(".people-profile")
    .filter({ hasText: "Blair Example" })
    .getByRole("button", { name: "Open profile" })
    .click();
  await page.getByRole("tab", { name: "Permissions", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Assigned demo role", exact: true })
    .selectOption("Administrator");
  await page.getByRole("checkbox", { name: "Create", exact: true }).check();
  const hidden = page.getByRole("listbox", { name: "Hide modules" });
  await hidden.selectOption(
    await hidden
      .locator("option")
      .evaluateAll((options) =>
        options.filter((o) => /^Assets/.test(o.value)).map((o) => o.value),
      ),
  );
  await page.getByRole("button", { name: "Save person permissions" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Sample team member").selectOption("Blair Example");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Assets & equipment", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Tasks & projects", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New task", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Sample team member").selectOption("Alex Example");
  await nav(page, "Dashboard");
  await page.getByRole("button", { name: "Customise dashboard" }).click();
  await page.getByText("Filters for Upcoming shifts", { exact: true }).click();
  await page
    .getByLabel("Upcoming shifts status filter")
    .selectOption("Planned");
  await page.getByRole("button", { name: "Reset to company template" }).click();
  await expect(page.getByLabel("Upcoming shifts status filter")).toHaveValue(
    "",
  );
});
