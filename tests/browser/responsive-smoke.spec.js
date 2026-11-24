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
