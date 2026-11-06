import test from "node:test";
import assert from "node:assert/strict";
import { assertBackend } from "../src/backend/contracts.js";
import {
  createFictionalBackend,
  fictionalFixtures,
} from "../src/backend/fictional.js";

const orgId = "demo-heritage",
  otherId = "demo-charity";
test("fictional adapter satisfies every required port and has no authenticated account", async () => {
  const backend = assertBackend(createFictionalBackend());
  assert.equal(backend.kind, "fictional-memory");
  assert.equal(await backend.auth.getSession(), null);
  assert.throws(() => assertBackend({}), /Missing backend method/);
  assert.throws(
    () => assertBackend({ ...backend, records: {} }),
    /records.list/,
  );
});
test("load rejects on failure and can be retried without changing fixtures", async () => {
  let calls = 0;
  const backend = createFictionalBackend({
    beforeLoad: async () => {
      if (++calls === 1) throw new Error("offline");
    },
  });
  await assert.rejects(backend.load(), /offline/);
  assert.equal((await backend.load()).orgs.length, 4);
  assert.equal(backend.getRevision(), 0);
});
test("snapshots are stable and immutable; lists and loads are detached copies", async () => {
  const backend = createFictionalBackend();
  const snapshot = backend.getSnapshot();
  assert.equal(backend.getSnapshot(), snapshot);
  assert.throws(() => {
    snapshot.orgs[0].modules.push("Unexpected");
  }, TypeError);
  const loaded = await backend.load();
  loaded.orgs[0].name = "Changed outside adapter";
  const list = await backend.organisations.list();
  list[0].admins.length = 0;
  assert.notEqual(backend.getSnapshot().orgs[0].name, loaded.orgs[0].name);
  assert.equal(backend.getSnapshot().orgs[0].admins.length, 1);
});
test("organisation creation seeds demo records atomically and rejects invalid or duplicate IDs", async () => {
  const backend = createFictionalBackend();
  let publications = 0;
  const stop = backend.subscribe(() => publications++);
  const org = await backend.organisations.create({
    id: "test-org",
    name: "Fictional works",
    sector: "engineering",
  });
  assert.equal(publications, 1);
  assert.ok((await backend.records.list(org.id)).length > 0);
  await assert.rejects(
    backend.organisations.create({ id: org.id, name: "Duplicate" }),
    /Duplicate/,
  );
  await assert.rejects(backend.organisations.create({ name: " " }));
  assert.equal(publications, 1);
  stop();
  await backend.organisations.update(org.id, { color: "#112233" });
  assert.equal(publications, 1);
});
test("membership and entitlement ports change only the addressed fictional organisation", async () => {
  const backend = createFictionalBackend();
  const other = await backend.memberships.list(otherId);
  await backend.memberships.replace(orgId, [
    { name: "Sample manager", role: "Manager" },
  ]);
  await backend.entitlements.replace(orgId, ["Volunteers"]);
  assert.deepEqual(await backend.memberships.list(otherId), other);
  assert.deepEqual(await backend.entitlements.list(orgId), ["Volunteers"]);
  assert.equal((await backend.memberships.list(orgId))[0].role, "Manager");
  await assert.rejects(
    backend.organisations.update(orgId, { modules: [] }),
    /port/,
  );
});
test("record scope and immutable identity checks catch demo ID mistakes", async () => {
  const backend = createFictionalBackend();
  const record = await backend.records.create(orgId, {
    module: "Volunteers",
    title: "Sample",
    detail: "Fictional",
    status: "Planned",
  });
  await backend.records.update(orgId, record.id, { status: "Complete" });
  assert.equal(
    (await backend.records.list(orgId)).find((r) => r.id === record.id).status,
    "Complete",
  );
  assert.ok(
    !(await backend.records.list(otherId)).some((r) => r.id === record.id),
  );
  await assert.rejects(
    backend.records.update(otherId, record.id, { status: "Planned" }),
  );
  for (const patch of [
    { id: "forged" },
    { orgId: otherId },
    { module: "Assets" },
  ])
    await assert.rejects(
      backend.records.update(orgId, record.id, patch),
      /identity/,
    );
  await assert.rejects(
    backend.records.create(orgId, { orgId: otherId, module: "Volunteers" }),
  );
  await backend.entitlements.replace(orgId, []);
  await assert.rejects(
    backend.records.update(orgId, record.id, { status: "Planned" }),
  );
  await assert.rejects(backend.records.create(orgId, { module: "Volunteers" }));
});
test("support tickets retain fictional history and reject mismatched addresses", async () => {
  const backend = createFictionalBackend();
  const t = await backend.supportTickets.create(orgId, {
    subject: "Sample",
    history: [],
    status: "Open",
  });
  await backend.supportTickets.update(orgId, t.id, {
    status: "Closed",
    history: [{ text: "Local note" }],
  });
  assert.equal(
    (await backend.supportTickets.list(orgId)).find((r) => r.id === t.id)
      .history.length,
    1,
  );
  await assert.rejects(
    backend.supportTickets.update(otherId, t.id, { status: "Open" }),
  );
  await assert.rejects(
    backend.supportTickets.update(orgId, t.id, { orgId: otherId }),
  );
  await assert.rejects(
    backend.supportTickets.create(orgId, { orgId: otherId }),
  );
});
test("all tenant-addressed ports reject unknown example organisations", async () => {
  const backend = createFictionalBackend();
  for (const port of [
    "memberships",
    "entitlements",
    "records",
    "supportTickets",
    "auditEvents",
  ])
    await assert.rejects(
      backend[port].list("forged-org"),
      /Unknown example organisation/,
    );
  await assert.rejects(
    backend.organisations.update("forged-org", { name: "Sample" }),
  );
  await assert.rejects(backend.organisations.update(orgId, { id: otherId }));
});
test("local activity is bounded and addressed by organisation, with detached results", async () => {
  const backend = createFictionalBackend();
  for (let i = 0; i < 205; i++)
    await backend.auditEvents.append(orgId, `Sample ${i}`);
  const logs = await backend.auditEvents.list(orgId);
  assert.equal(logs.length, 200);
  assert.equal(logs[0].event, "Sample 204");
  assert.deepEqual(await backend.auditEvents.list(otherId), []);
  logs[0].event = "Mutated";
  assert.equal((await backend.auditEvents.list(orgId))[0].event, "Sample 204");
});
test("concurrent demo creates and functional pricing edits preserve independent changes", async () => {
  const backend = createFictionalBackend();
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      backend.organisations.create({ name: `Sample ${i}`, id: `new-${i}` }),
    ),
  );
  assert.equal((await backend.organisations.list()).length, 12);
  await Promise.all(
    Array.from({ length: 8 }, () =>
      backend.demoSettings.setPlans((old) =>
        old.map((p) => ({ ...p, monthly: p.monthly + 1 })),
      ),
    ),
  );
  assert.equal(backend.getSnapshot().plans[0].monthly, 8);
  // In-process sequencing only, not a distributed transaction test.
});
test("reset restores all fictional resources and new adapter instances stay independent", async () => {
  const backend = createFictionalBackend(),
    independent = createFictionalBackend();
  await backend.organisations.update(orgId, { name: "Edited sample" });
  await backend.memberships.replace(orgId, []);
  await backend.entitlements.replace(orgId, []);
  await backend.demoSettings.setFlags({ customerPreview: false });
  await backend.demoSettings.setPlans([]);
  await backend.auditEvents.append(orgId, "Sample change");
  await backend.supportTickets.update(orgId, "ticket-1", { status: "Closed" });
  assert.deepEqual(await independent.load(), fictionalFixtures());
  await backend.reset();
  assert.deepEqual(await backend.load(), fictionalFixtures());
});
