import { test, expect } from "@playwright/test";
test("offline service isolates synthetic tenants in browser runtime without changing demo", async ({
  page,
}) => {
  await page.goto("./");
  const result = await page.evaluate(async () => {
    const { createOfflineBackend } =
      await import("/owner-admin/src/backend/offline.js");
    const service = createOfflineBackend();
    const alice = await service.fakeLogin("alice");
    const bob = await service.fakeLogin("bob");
    const record = await alice.records.create("alpha", {
      module: "tasks",
      title: "Browser synthetic task",
    });
    let denial;
    try {
      await bob.records.get("alpha", record.id);
    } catch (error) {
      denial = error.code;
    }
    await alice.records.update("alpha", record.id, { progress: 100 }, 1);
    return {
      denial,
      progress: (await alice.records.get("alpha", record.id)).progress,
      beta: await bob.records.list("beta", "tasks"),
    };
  });
  expect(result).toEqual({ denial: "FORBIDDEN", progress: 100, beta: [] });
  await expect(page.locator("body")).toContainText("Owner Admin");
});
