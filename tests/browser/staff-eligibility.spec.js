import {test,expect} from "@playwright/test";
async function openEngineering(page){
 await page.goto("./");
 await page.getByRole("button",{name:"Explore customer workspace"}).click();
 await page.getByLabel("Example workspace").selectOption("demo-engineering");
}
async function navigate(page,title){
 await page.getByRole("button",{name:"Open navigation menu"}).click();
 await page.getByRole("navigation").getByRole("button",{name:title,exact:true}).click();
}
test("maintenance assignment excludes unqualified staff and explains why",async({page})=>{
 await openEngineering(page);await navigate(page,"Maintenance & work orders");
 await page.getByRole("button",{name:"Raise work order"}).click();
 const picker=page.getByRole("dialog").getByLabel("Assigned engineer");
 await expect(picker.locator("option")).toContainText(["Choose eligible staff","Sample coordinator A · Operations"]);
 await expect(picker.locator("option").filter({hasText:"Sample colleague B"})).toHaveCount(0);
 await page.getByRole("dialog").getByText("Why are", {exact:false}).click();
 await expect(page.getByRole("dialog")).toContainText("No recorded maintenance / engineering qualification");
 await picker.selectOption("Sample coordinator A");
 await page.getByRole("dialog").getByLabel("Record title").fill("Check motor bearings");
 await page.getByRole("button",{name:"Save sample work order"}).click();
 await expect(page.locator(".job-board-card").filter({hasText:"Check motor bearings"})).toContainText("Sample coordinator A");
});
test("inspection assignment includes inspection-trained staff",async({page})=>{
 await openEngineering(page);await navigate(page,"Inspections");
 await page.getByRole("button",{name:"New inspection"}).click();
 await expect(page.getByRole("dialog").getByLabel("Inspector").locator("option").filter({hasText:"Sample colleague B"})).toHaveCount(1);
});
test("competency matrix updates assignment eligibility when expiry changes",async({page})=>{
 await openEngineering(page);await navigate(page,"Training and qualifications");
 await expect(page.getByRole("table")).toContainText("Maintenance engineering");
 await page.getByRole("button",{name:"Sample coordinator A · Maintenance engineering · Valid",exact:true}).click();
 await page.getByRole("dialog").getByLabel("expiry",{exact:true}).fill("2020-01-01");
 await page.getByRole("dialog").getByRole("button",{name:"Close dialog"}).click();
 await navigate(page,"Maintenance & work orders");
 await page.getByRole("button",{name:"Raise work order"}).click();
 await expect(page.getByRole("dialog").getByLabel("Assigned engineer").locator("option").filter({hasText:"Sample coordinator A"})).toHaveCount(0);
});
