import {test,expect} from "@playwright/test";
async function enter(page){await page.goto("./");await page.getByRole("button",{name:"Explore customer workspace"}).click();await page.getByLabel("Example workspace").selectOption("demo-visitor");}
async function nav(page,name){await page.getByRole("button",{name:"Open navigation menu"}).click();await page.getByRole("navigation").getByRole("button",{name,exact:true}).click();}
test("event capacity, waitlist and check-in",async({page})=>{
 await enter(page);await nav(page,"Events & bookings");await page.getByRole("button",{name:"New event"}).click();
 await page.getByLabel("Event name").fill("Sample guided tour");await page.getByLabel("Starts").fill("2026-12-15T10:00");await page.getByLabel("Capacity").fill("2");await page.getByRole("button",{name:"Create event"}).click();
 await page.getByRole("button",{name:"Booking desk"}).click();const eventId=await page.getByLabel("Choose event").locator("option").filter({hasText:"Sample guided tour"}).getAttribute("value");await page.getByLabel("Choose event").selectOption(eventId);
 await page.getByLabel("Attendee or group").fill("Sample group one");await page.getByLabel("Places").fill("2");await page.getByRole("button",{name:"Reserve places"}).click();await expect(page.getByText("Booking confirmed in the demo.")).toBeVisible();
 await page.getByLabel("Attendee or group").fill("Sample group two");await page.getByLabel("Places").fill("1");await page.getByRole("button",{name:"Reserve places"}).click();await expect(page.getByText("Capacity exceeded; booking added to the waitlist.")).toBeVisible();
 await page.getByRole("button",{name:"Check-in"}).click();await page.getByLabel("Booking status for Sample group one").selectOption("Checked in");await expect(page.getByRole("row").filter({hasText:"Sample group one"})).toContainText("Checked in");
});
test("form builder creates fields and stores responses",async({page})=>{
 await enter(page);await nav(page,"Forms and surveys");await page.getByRole("button",{name:"Form builder"}).click();await page.getByLabel("Question or label").fill("Visitor rating");await page.getByLabel("Answer type").selectOption("Number");await page.getByRole("button",{name:"Add field"}).click();
 await page.getByRole("button",{name:"Complete form"}).click();await page.getByLabel("Location").fill("Reception");await page.getByLabel("Site left secure").selectOption("Yes");await page.getByLabel("Visitor rating").fill("5");await page.getByRole("button",{name:"Submit response"}).click();
 await expect(page.getByText("Form response submitted in this demo.")).toBeVisible();await page.locator(".form-response summary").first().click();await expect(page.getByText("Visitor rating")).toBeVisible();
});
