import { test, expect } from "@playwright/test";

async function navigate(page, title) {
  await page.getByRole("button", {name:"Open navigation menu",exact:true}).click();
  await page.getByRole("navigation").getByRole("button",{name:title,exact:true}).click();
}
async function openCustomer(page) {
  await page.goto("./");
  await page.getByRole("button",{name:"Explore customer workspace"}).click();
}

test("customer task board supports task creation, checklist, notes and status changes",async ({page})=>{
  await openCustomer(page);
  await navigate(page,"Tasks & projects");
  await expect(page.getByRole("heading",{name:"Tasks & Projects",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Board",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"New task"}).click();
  await page.getByRole("textbox",{name:"Task title"}).fill("Sample review workshop equipment");
  await page.getByRole("textbox",{name:"Description"}).fill("Inspect sample equipment and record findings");
  await page.getByRole("textbox",{name:"Assign to"}).fill("Sample supervisor");
  await page.getByLabel("Due date").fill("2026-11-20");
  await page.getByRole("textbox",{name:"Checklist items (one per line)"}).fill("Prepare kit\nCheck readings");
  await page.getByRole("button",{name:"Create task"}).click();
  await expect(page.getByRole("button",{name:"Sample review workshop equipment"})).toBeVisible();
  await page.getByRole("button",{name:"Sample review workshop equipment"}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("checkbox",{name:"Prepare kit"}).check();
  await page.getByRole("textbox",{name:"New note"}).fill("Sample check begun");
  await page.getByRole("button",{name:"Add note"}).click();
  await expect(page.getByText("Sample check begun")).toBeVisible();
  await page.getByRole("combobox",{name:"Task status"}).selectOption("Complete");
  await page.getByRole("button",{name:"Close dialog"}).click();
  await page.getByRole("button",{name:"List",exact:true}).click();
  await expect(page.getByRole("row").filter({hasText:"Sample review workshop equipment"})).toContainText("Complete");
  await navigate(page,"Calendar");
  await expect(page.getByRole("heading",{name:"Calendar"}).first()).toBeVisible();
});

test("customer universal pages provide work inbox, notifications and editable demo roles",async ({page})=>{
  await openCustomer(page);
  await navigate(page,"My work");
  await expect(page.getByRole("heading",{name:"My work"}).first()).toBeVisible();
  await page.getByLabel("Filter my work").selectOption("All");
  await expect(page.locator(".work-feed-item").first()).toBeVisible();
  await navigate(page,"Notifications");
  await expect(page.getByRole("heading",{name:"Notifications"}).first()).toBeVisible();
  await page.getByRole("button",{name:"Mark all read"}).click();
  await expect(page.getByText("You're all caught up with this notification filter.")).toBeVisible();
  await navigate(page,"Settings");
  await page.getByRole("textbox",{name:"New role"}).fill("Sample site leader");
  await page.getByRole("button",{name:"Add role"}).click();
  await expect(page.getByRole("combobox",{name:"Choose custom role"})).toHaveValue("Sample site leader");
  await page.getByRole("checkbox",{name:"Approve"}).check();
  await navigate(page,"Dashboard");
  await navigate(page,"Settings");
  await expect(page.getByRole("combobox",{name:"Choose custom role"}).getByRole("option",{name:"Sample site leader"})).toHaveCount(1);
});

test("different customer modules use purpose-built presentation",async ({page})=>{
  await openCustomer(page);
  await navigate(page,"Assets & equipment");
  await expect(page.locator(".purpose-card").first()).toBeVisible();
  await navigate(page,"Inspections & checklists");
  await expect(page.locator(".work-order").first()).toBeVisible();
  await navigate(page,"Staff & volunteers");
  await expect(page.locator(".purpose-card").first()).toBeVisible();
  await navigate(page,"Tasks & projects");
  await expect(page.locator(".kanban-column")).toHaveCount(3);
  await page.getByRole("button",{name:"List",exact:true}).click();
  await expect(page.getByRole("table")).toBeVisible();
});

test("owner demo supports leads, requests, announcements and branding",async ({page})=>{
  await page.goto("./");
  await navigate(page,"Sales Leads");
  await page.getByRole("textbox",{name:"Company"}).fill("Example New Client");
  await page.getByRole("button",{name:"Add prospect"}).click();
  await expect(page.getByText("Example New Client")).toBeVisible();
  await page.getByLabel("Stage for Example New Client").selectOption("Discovery");
  await navigate(page,"Feature Requests");
  await page.getByRole("textbox",{name:"Feature description"}).fill("Sample QR label templates");
  await page.getByRole("button",{name:"Add request"}).click();
  await expect(page.getByText("Sample QR label templates")).toBeVisible();
  await navigate(page,"Announcements");
  await page.getByRole("textbox",{name:"Headline"}).fill("Sample platform update");
  await page.getByRole("textbox",{name:"Message"}).fill("This is a fictional announcement");
  await page.getByRole("button",{name:"Save draft"}).click();
  await expect(page.getByText("Sample platform update")).toBeVisible();
  await navigate(page,"Branding Templates");
  await expect(page.getByRole("heading",{name:"Branding templates"}).first()).toBeVisible();
  await page.getByRole("button",{name:"Apply to fictional company"}).click();
  await navigate(page,"Client Insights");
  await expect(page.getByRole("heading",{name:"Client insights"}).first()).toBeVisible();
});
