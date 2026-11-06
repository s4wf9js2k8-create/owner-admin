import { test, expect } from "@playwright/test";

async function go(page,name) {
  await page.getByRole("button",{name:"Open navigation menu",exact:true}).click();
  await page.getByRole("navigation").getByRole("button",{name,exact:true}).click();
}
async function customer(page,orgId) {
  await page.goto("./");
  await page.getByRole("button",{name:"Explore customer workspace"}).click();
  if(orgId) await page.getByLabel("Example workspace",{exact:true}).selectOption(orgId);
}

test("customer role changes navigation and global search opens a linked asset profile",async ({page})=>{
  await customer(page);
  await page.getByLabel("Simulated customer role").selectOption("Viewer");
  await page.getByRole("button",{name:"Open navigation menu",exact:true}).click();
  const nav=page.getByRole("navigation");
  await expect(nav.getByRole("button",{name:"Assets & equipment",exact:true})).toBeVisible();
  await expect(nav.getByRole("button",{name:"Maintenance",exact:true})).toHaveCount(0);
  await nav.getByRole("button",{name:"Dashboard",exact:true}).click();
  await page.getByLabel("Search or run a command").fill("Workshop compressor");
  await page.getByRole("region",{name:"Global search results"}).getByRole("button",{name:/Workshop compressor/}).click();
  await expect(page.getByRole("dialog")).toContainText("Workshop compressor");
  await page.getByRole("button",{name:"Close dialog"}).click();
  await page.getByLabel("Simulated customer role").selectOption("Administrator");
  await go(page,"Maintenance");
  await expect(page.getByRole("heading",{name:"Maintenance & work orders",exact:true})).toBeVisible();
});

test("failed inspection creates a corrective work order linked to its source",async ({page})=>{
  await customer(page);
  await go(page,"Inspections & checklists");
  await page.getByRole("button",{name:"New inspection"}).click();
  await page.getByRole("textbox",{name:"Record title"}).fill("Sample ladder check");
  await page.getByLabel("Asset",{exact:true}).selectOption({label:"EQ-101"});
  await page.getByRole("button",{name:"Save sample inspection"}).click();
  await page.locator(".inspection-row").filter({hasText:"Sample ladder check"}).getByRole("button",{name:"Inspect"}).click();
  await page.getByLabel("Inspection result").selectOption("Fail");
  await page.getByRole("dialog").getByRole("button",{name:"Create corrective work order"}).click();
  await expect(page.getByRole("heading",{name:"Maintenance & work orders",exact:true})).toBeVisible();
  const work=page.locator(".job-board-card").filter({hasText:"Corrective action: Sample ladder check"});
  await expect(work).toBeVisible();
  await work.getByRole("button",{name:"Manage work order"}).click();
  await page.getByRole("button",{name:"Open source inspection"}).click();
  await expect(page.getByRole("dialog")).toContainText("Sample ladder check");
});

test("stock allocation decrements available units and appears on maintenance work order",async ({page})=>{
  await customer(page,"demo-visitor");
  await go(page,"Inventory and stock");
  await page.getByRole("row").filter({hasText:"Hi-vis safety vest"}).getByRole("button",{name:"Stock movement"}).click();
  await page.getByLabel("Stock operation").selectOption("Allocate");
  await page.getByLabel("Allocate to work order").selectOption({label:"Entrance lighting repair"});
  await page.getByRole("spinbutton",{name:"Quantity"}).fill("1");
  await page.getByRole("button",{name:"Record stock movement"}).click();
  await expect(page.getByRole("dialog")).toContainText("4 units");
  await page.getByRole("button",{name:"Close dialog"}).click();
  await go(page,"Maintenance");
  const work=page.locator(".job-board-card").filter({hasText:"Entrance lighting repair"});
  await work.getByRole("button",{name:"Manage work order"}).click();
  await expect(page.getByRole("dialog")).toContainText("Hi-vis safety vest: 1 units");
});

test("dashboard reflects clock-in and clock-out from attendance module",async ({page})=>{
  await customer(page);
  await expect(page.getByText("On site",{exact:true}).first()).toBeVisible();
  await go(page,"Attendance & Hours");
  await page.getByLabel("Clock-in team member").selectOption("Sample volunteer B");
  await page.getByRole("button",{name:"Clock in"}).click();
  const open=page.locator(".people-time-list").first();
  await expect(open).toContainText("Sample volunteer B");
  await open.locator("article").filter({hasText:"Sample volunteer B"}).getByRole("button",{name:"Clock out"}).click();
  await go(page,"Dashboard");
  await expect(page.getByRole("heading",{name:"Staff on site"})).toBeVisible();
  await expect(page.getByText("Sample volunteer A",{exact:true}).first()).toBeVisible();
});

test("projects group tasks, and pending approvals block completion",async ({page})=>{
  await customer(page);
  await go(page,"Tasks & projects");
  await expect(page.getByRole("button",{name:"My tasks",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"New project"}).click();
  await page.getByLabel("Project name").fill("Sample station project");
  await page.getByLabel("Project summary").fill("Temporary sample project");
  await page.getByRole("button",{name:"Create project"}).click();
  await page.getByRole("button",{name:"New task"}).click();
  await page.getByLabel("Task title").fill("Sample project task");
  await page.getByLabel("Project",{exact:true}).selectOption({label:"Sample station project"});
  await page.getByRole("button",{name:"Create task"}).click();
  await page.getByRole("button",{name:"Sample project task",exact:true}).click();
  await page.getByRole("button",{name:"Request manager approval"}).click();
  await page.getByLabel("Task status").selectOption("Complete");
  await expect(page.getByRole("dialog")).toContainText("awaiting manager approval");
  await page.getByRole("button",{name:"Approve task"}).click();
  await page.getByLabel("Task status").selectOption("Complete");
  await expect(page.getByLabel("Task status")).toHaveValue("Complete");
  await page.getByRole("button",{name:"Close dialog"}).click();
  await page.getByRole("button",{name:"Projects",exact:true}).click();
  await page.locator(".project-card").filter({hasText:"Sample station project"}).getByRole("button",{name:"Open project"}).click();
  await expect(page.getByRole("dialog")).toContainText("1 / 1 linked tasks complete");
});
