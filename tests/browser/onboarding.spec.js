import { test, expect } from "@playwright/test";
test("company request remains pending until operator approval; client views stay separate", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Company onboarding simulation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Onboard a fictional company" }),
  ).toBeVisible();
  await page.getByLabel("Simulated identity").selectOption("alice");
  await expect(page.getByText("Subscribed package:")).toContainText(
    "Essential",
  );
  await expect(
    page.getByRole("heading", { name: "Fictional beta", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Onboard a fictional company" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Requested package for Fictional alpha")
    .selectOption("Professional");
  await page
    .getByRole("button", { name: "Request package change for Fictional alpha" })
    .click();
  await expect(page.getByText("Request: Professional")).toContainText(
    "pending",
  );
  await expect(page.getByText("Available modules:")).toHaveText(
    "Available modules: tasks",
  );
  await page.getByLabel("Simulated identity").selectOption("owner");
  await page
    .getByRole("button", { name: "Approve Professional", exact: true })
    .click();
  await expect(
    page.getByText("Fictional alpha requests Professional: approved"),
  ).toBeVisible();
  await page.getByLabel("Simulated identity").selectOption("alice");
  await expect(page.getByText("Subscribed package:")).toContainText(
    "Professional",
  );
  await expect(page.getByText("Available modules:")).toContainText("reporting");
  await page
    .getByRole("button", { name: "Return to public demonstration" })
    .click();
  await expect(
    page.getByRole("button", { name: "+ Add example organisation" }),
  ).toBeVisible();
});
test("operator onboards, invites an isolated admin and suspends/reactivates a company", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Company onboarding simulation", exact: true })
    .click();
  await page
    .getByLabel("Fictional company name")
    .fill("Fictional Invitation Co");
  await page.getByLabel("Initial package").selectOption("Enterprise");
  await page
    .getByRole("button", { name: "Create fictional company", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Invite fictional admin to Fictional Invitation Co",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Invitation for fictional guest to Fictional Invitation Co"),
  ).toBeVisible();
  await page.getByLabel("Simulated identity").selectOption("guest");
  await page
    .getByRole("button", { name: "Accept fictional admin invitation" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Fictional Invitation Co", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fictional alpha", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Simulated identity").selectOption("owner");
  await page
    .getByRole("button", {
      name: "Suspend Fictional Invitation Co",
      exact: true,
    })
    .click();
  await page.getByLabel("Simulated identity").selectOption("guest");
  await expect(page.getByText("No company membership.")).toBeVisible();
  await page.getByLabel("Simulated identity").selectOption("owner");
  await page
    .getByRole("button", {
      name: "Reactivate Fictional Invitation Co",
      exact: true,
    })
    .click();
  await page.getByLabel("Simulated identity").selectOption("guest");
  await expect(
    page.getByRole("heading", { name: "Fictional Invitation Co", exact: true }),
  ).toBeVisible();
});

test("standalone reporting request needs operator approval and keeps Essential package", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Company onboarding simulation", exact: true })
    .click();
  await page.getByLabel("Simulated identity").selectOption("alice");
  await page
    .getByRole("button", {
      name: "Request reporting feature for Fictional alpha",
      exact: true,
    })
    .click();
  await expect(page.getByText("Request: reporting feature")).toContainText(
    "pending",
  );
  await expect(page.getByText("Available modules:")).toHaveText(
    "Available modules: tasks",
  );
  await page.getByLabel("Simulated identity").selectOption("owner");
  await page
    .getByRole("button", { name: "Approve reporting feature", exact: true })
    .click();
  await page.getByLabel("Simulated identity").selectOption("alice");
  await expect(page.getByText("Subscribed package:")).toContainText(
    "Essential",
  );
  await expect(page.getByText("Available modules:")).toContainText("reporting");
});
