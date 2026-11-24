import { test, expect } from "@playwright/test";
import { openDestination as nav } from "./navigation.js";
test("touch navigation, operational agenda and owner access controls fit the screen", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page
    .getByRole("button", { name: "Explore customer workspace" })
    .click();
  await page.getByLabel("Example workspace").selectOption("demo-engineering");
  await nav(page, "Shift rotas");
  await page.getByLabel("Rota week containing").fill("2026-11-13");
  await expect(page.locator(".rota-planner")).toBeVisible();
  await page.getByRole("button", { name: "Add shift", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Staff & volunteers");
  await page
    .locator(".people-profile")
    .first()
    .getByRole("button", { name: "Open profile" })
    .click();
  await page.getByRole("tab", { name: "Permissions", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save person permissions" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Example workspace").selectOption("demo-visitor");
  await nav(page, "Bookings and appointments");
  await page
    .getByRole("button", { name: "Resource bookings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New resource booking", exact: true })
    .click();
  const booking = page.getByRole("dialog");
  await booking.getByLabel("Booking title").fill("Touch resource reservation");
  await booking
    .getByRole("combobox", { name: "Booking customer", exact: true })
    .selectOption({ index: 1 });
  await booking.getByLabel("Booking starts").fill("2027-01-07T09:00");
  await booking.getByLabel("Booking ends").fill("2027-01-07T10:00");
  await booking
    .getByRole("combobox", { name: "Bookable resource", exact: true })
    .selectOption("demo-visitor-meeting-room");
  await booking.getByRole("button", { name: "Save resource booking" }).click();
  await expect(booking).toHaveCount(0);
  await expect(page.locator(".resource-booking-card")).toContainText(
    "Touch resource reservation",
  );
  await page
    .getByRole("button", { name: "Owner console", exact: true })
    .click();
  await nav(page, "Owner Access");
  await expect(
    page.getByRole("button", { name: "Create owner account record" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
