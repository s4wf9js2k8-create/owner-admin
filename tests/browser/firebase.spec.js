import { test, expect } from "@playwright/test";
test("Firebase preparation works offline and keeps public demo intact", async ({
  page,
}) => {
  await page.goto("./");
  const result = await page.evaluate(async () => {
    const { createOfflineBackend } =
      await import("/owner-admin/src/backend/offline.js");
    const { createFirebaseAdapter, createOfflineFirebaseTransport } =
      await import("/owner-admin/src/backend/firebase.js");
    const service = createOfflineBackend();
    const adapt = async (uid) =>
      createFirebaseAdapter({
        transport: createOfflineFirebaseTransport(await service.fakeLogin(uid)),
      });
    const a = await adapt("alice"),
      b = await adapt("bob");
    const row = await a.records.create("alpha", {
      module: "tasks",
      title: "Synthetic prepared record",
    });
    let denied;
    try {
      await b.records.get("alpha", row.id);
    } catch (e) {
      denied = e.code;
    }
    return {
      denied,
      session: await a.auth.getSession(),
      count: (await b.records.list("beta", "tasks")).length,
    };
  });
  expect(result).toEqual({
    denied: "FORBIDDEN",
    session: { uid: "alice", mocked: true },
    count: 0,
  });
  await expect(
    page.getByRole("button", { name: "+ Add example organisation" }),
  ).toBeVisible();
});
