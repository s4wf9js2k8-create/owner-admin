import { test, expect } from "@playwright/test";
test("private workspace is explicit and unavailable server leaves fictional demo intact", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Private server workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Server sign in", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Email", { exact: true })
    .fill("synthetic@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-password-only");
  await page
    .getByRole("button", { name: "Sign in to private server", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Server unavailable");
  await page
    .getByRole("button", {
      name: "Return to fictional demonstration",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "+ Add example organisation",
      exact: true,
    }),
  ).toBeVisible();
});
test("operator storage dashboard requires server session and displays server usage", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const data = url.pathname.endsWith("/auth/login")
      ? { id: "synthetic-owner", platformAdmin: true }
      : url.pathname.endsWith("/owner/storage")
        ? {
            allocation_bytes: 21474836480,
            companies: [
              {
                id: "alpha",
                name: "Synthetic Alpha",
                used_bytes: "512",
                quota_bytes: "1048576",
              },
            ],
          }
        : url.pathname.endsWith("/companies")
          ? [
              {
                id: "alpha",
                name: "Synthetic Alpha",
                package: "Essential",
                modules: ["tasks"],
                status: "active",
                color: "#28533a",
                version: 1,
              },
            ]
          : {};
    await route.fulfill({ json: data });
  });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Private server workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Server Management", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Email", { exact: true })
    .fill("operator@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-password-only");
  await page
    .getByRole("button", { name: "Sign in to private server", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Server Management", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "Synthetic Alpha" })).toBeVisible();
  await expect(page.getByText("20.00 GiB")).toBeVisible();
  await expect(page.getByText("Within quota")).toBeVisible();
  await page
    .getByRole("button", { name: "Sign out of server", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Server Management", exact: true }),
  ).toHaveCount(0);
});
