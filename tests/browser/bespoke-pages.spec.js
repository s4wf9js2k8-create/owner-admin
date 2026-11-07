import {test,expect} from "@playwright/test";
async function enter(page,company){await page.goto("./");await page.getByRole("button",{name:"Explore customer workspace"}).click();await page.getByLabel("Example workspace").selectOption(company);}
async function nav(page,name){await page.getByRole("button",{name:"Open navigation menu"}).click();await page.getByRole("navigation").getByRole("button",{name,exact:true}).click();}
test("maintenance engineer comes from the staff directory, with a linked asset",async({page})=>{
 await enter(page,"demo-engineering");
 await nav(page,"Maintenance & work orders");
 await page.getByRole("button",{name:"Raise work order"}).click();
 await page.getByRole("dialog").getByRole("textbox",{name:"Record title"}).fill("Inspect workshop pumps");
 await page.getByRole("dialog").getByLabel("Assigned engineer").selectOption("Sample coordinator A");
 await page.getByRole("dialog").getByLabel("Asset").selectOption({index:1});
 await page.getByRole("button",{name:"Save sample work order"}).click();
 await expect(page.locator(".job-board-card").filter({hasText:"Inspect workshop pumps"})).toContainText("Sample coordinator A");
 await page.locator(".job-board-card").filter({hasText:"Inspect workshop pumps"}).getByRole("button",{name:"Manage work order"}).click();
 await expect(page.getByRole("dialog").getByLabel("Assigned engineer")).toHaveValue("Sample coordinator A");
 await expect(page.getByRole("dialog").getByRole("button",{name:"Open linked asset"})).toBeVisible();
});
test("CRM customer is selectable when creating a line-item quotation",async({page})=>{
 await enter(page,"demo-engineering");
 await nav(page,"Customers / CRM");
 await page.getByRole("button",{name:"Add company"}).click();
 await page.getByRole("dialog").getByLabel("Company name").fill("Harbour Engineering Supplies");
 await page.getByRole("dialog").getByLabel("Account manager").selectOption("Sample coordinator A");
 await page.getByRole("button",{name:"Create company"}).click();
 await expect(page.getByText("Harbour Engineering Supplies")).toBeVisible();
 await nav(page,"Quotes and invoices");
 await page.getByRole("button",{name:"Build quote"}).click();
 await page.getByRole("dialog").getByLabel("Quote reference").fill("Q-150");
 const customers=page.getByRole("dialog").getByLabel("Customer");
 await customers.selectOption({label:"Harbour Engineering Supplies"});
 await page.getByRole("dialog").getByLabel("Item 1").fill("Service equipment");
 await page.getByRole("dialog").getByLabel("Qty").fill("2");
 await page.getByRole("dialog").getByLabel("Unit price (£)").fill("15");
 await page.getByRole("button",{name:"Save draft quotation"}).click();
 await expect(page.locator(".quote-document").filter({hasText:"Q-150"})).toContainText("£30.00");
 await page.locator(".quote-document").filter({hasText:"Q-150"}).getByRole("button",{name:"Open document"}).click();
 await expect(page.getByRole("dialog")).toContainText("Harbour Engineering Supplies");
});
test("fleet daily checks record mileage and surface defects",async({page})=>{
 await enter(page,"demo-engineering"); await nav(page,"Vehicle / fleet management");
 await page.getByRole("button",{name:"Register vehicle"}).click();
 await page.getByRole("dialog").getByLabel("Title").fill("Workshop delivery van");
 await page.getByRole("dialog").getByLabel("Vehicle reference").fill("VH-200");
 await page.getByRole("button",{name:"Create sample entry"}).click();
 await page.locator(".vehicle-card").filter({hasText:"VH-200"}).getByRole("button",{name:"Open vehicle checks"}).click();
 await page.getByRole("dialog").getByLabel("Odometer").fill("17500");
 await page.getByRole("dialog").getByLabel("Result").selectOption("Defect");
 await page.getByRole("dialog").getByLabel("Findings").fill("Headlight damaged");
 await page.getByRole("dialog").getByRole("button",{name:"Save check"}).click();
 await expect(page.getByRole("dialog")).toContainText("Headlight damaged");
 await expect(page.getByRole("dialog")).toContainText("17,500");
});
test("daily operations is a checkbox-driven handover instead of a table",async({page})=>{
 await enter(page,"demo-visitor"); await nav(page,"Daily operations");
 await expect(page.locator(".daily-check").first()).toBeVisible();
 const check=page.locator(".daily-check").first();
 await check.getByRole("checkbox").check();
 await expect(check.getByRole("checkbox")).toBeChecked();
 await check.getByRole("button",{name:"Handover notes"}).click();
 await page.getByRole("dialog").getByLabel("Handover note").fill("Completed morning checks");
 await page.getByRole("dialog").getByRole("button",{name:"Add handover note"}).click();
 await expect(page.getByRole("dialog")).toContainText("Completed morning checks");
});
