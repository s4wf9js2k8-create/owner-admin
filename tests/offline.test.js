import { test } from "node:test";
import assert from "node:assert/strict";
import { createOfflineBackend } from "../src/backend/offline.js";
const rejects = (promise, code) => assert.rejects(promise, { code });
async function setup() {
  const service = createOfflineBackend();
  const [a, b, v, s, o, g] = await Promise.all(
    ["alice", "bob", "viewer", "staff", "owner", "guest"].map((u) =>
      service.fakeLogin(u),
    ),
  );
  const row = await a.records.create("alpha", {
    module: "tasks",
    title: "Synthetic task",
  });
  return { service, a, b, v, s, o, g, row };
}
test("CRUD, detached values, atomic audit and optimistic races", async () => {
  const { a, row } = await setup();
  row.title = "tampered";
  assert.equal((await a.records.get("alpha", row.id)).title, "Synthetic task");
  const results = await Promise.allSettled([
    a.records.update("alpha", row.id, { title: "One" }, 1),
    a.records.update("alpha", row.id, { title: "Two" }, 1),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    results.find((r) => r.status === "rejected").reason.code,
    "CONFLICT",
  );
  await rejects(a.records.delete("alpha", row.id, 1), "CONFLICT");
  await a.records.delete("alpha", row.id, 2);
  assert.deepEqual(await a.records.list("alpha", "tasks"), []);
  assert.equal(
    (await a.auditEvents.list("alpha")).filter((e) => e.outcome === "SUCCESS")
      .length,
    3,
  );
});
test("cross tenant matrix covers all resource ports and forged addresses", async () => {
  const { a, b, row } = await setup();
  for (const operation of [
    () => b.records.get("alpha", row.id),
    () => b.records.list("alpha", "tasks"),
    () => b.records.create("alpha", { module: "tasks", title: "Attack" }),
    () => b.records.update("alpha", row.id, { title: "Attack" }, 1),
    () => b.records.delete("alpha", row.id, 1),
    () => b.memberships.list("alpha"),
    () => b.memberships.update("alpha", "alice", { role: "viewer" }, 1),
    () => b.entitlements.list("alpha"),
    () => b.auditEvents.list("alpha"),
    () => b.organisations.update("alpha", { name: "Attack" }, 1),
    () => b.invitations.create("alpha", "guest", "viewer"),
  ])
    await rejects(operation(), "FORBIDDEN");
  await rejects(b.records.get("beta", row.id), "NOT_FOUND");
  await rejects(
    b.records.update("beta", row.id, { title: "Attack" }, 1),
    "NOT_FOUND",
  );
  assert.deepEqual(
    (await b.organisations.list()).map((o) => o.id),
    ["beta"],
  );
  assert.equal((await a.records.get("alpha", row.id)).version, 1);
});
test("deny anonymous, forged sessions and roles; role-specific permissions", async () => {
  const { service, a, v, s, o, row } = await setup();
  await rejects(
    service.anonymous().records.list("alpha", "tasks"),
    "UNAUTHENTICATED",
  );
  await rejects(
    service.fakeLogin({ id: "alice", role: "owner" }),
    "UNAUTHENTICATED",
  );
  await rejects(
    v.records.update("alpha", row.id, { title: "Attack" }, 1),
    "FORBIDDEN",
  );
  await rejects(s.records.delete("alpha", row.id, 1), "FORBIDDEN");
  await rejects(a.configure("alpha", { modules: [] }, 1), "FORBIDDEN");
  await rejects(o.records.list("alpha", "tasks"), "FORBIDDEN");
  await rejects(
    a.memberships.update("alpha", "viewer", { role: "platform-owner" }, 1),
    "INVALID_INPUT",
  );
  await rejects(
    a.memberships.update("alpha", "alice", { role: "viewer" }, 1),
    "INVALID_INPUT",
  );
  await a.memberships.update("alpha", "staff", { role: "manager" }, 1);
  await s.records.delete("alpha", row.id, 1);
});
test("current revocation, module state, organisation state, logout and expiry", async () => {
  const { a, v, o, row } = await setup();
  await a.memberships.update("alpha", "viewer", { status: "revoked" }, 1);
  await rejects(v.records.list("alpha", "tasks"), "FORBIDDEN");
  await o.configure("alpha", { modules: [] }, 1);
  for (const op of [
    () => a.records.get("alpha", row.id),
    () => a.records.list("alpha", "tasks"),
    () => a.records.update("alpha", row.id, { title: "X" }, 1),
    () => a.records.delete("alpha", row.id, 1),
  ])
    await rejects(op(), "FORBIDDEN");
  await o.configure(
    "alpha",
    { modules: ["tasks"], features: { reporting: false } },
    2,
  );
  assert.equal((await a.entitlements.list("alpha")).features.reporting, false);
  await o.configure("alpha", { status: "suspended" }, 3);
  await rejects(a.memberships.list("alpha"), "FORBIDDEN");
  await a.auth.logout();
  await rejects(a.auth.getSession(), "UNAUTHENTICATED");
  let time = 0;
  const service = createOfflineBackend({ now: () => time });
  const client = await service.fakeLogin("alice");
  time = 3600000;
  await rejects(client.organisations.list(), "UNAUTHENTICATED");
});
test("validation rejects immutable identities, unknown fields, invalid values, stale config", async () => {
  const { a, o, row } = await setup();
  for (const patch of [
    { orgId: "beta" },
    { id: "x" },
    { module: "reporting" },
    { role: "owner" },
    { title: "" },
    { title: "x".repeat(101) },
    { progress: 101 },
    { progress: 0.5 },
    { detail: 9 },
    {},
  ])
    await rejects(a.records.update("alpha", row.id, patch, 1), "INVALID_INPUT");
  await rejects(
    a.records.create("alpha", { module: "tasks", title: "X", uid: "bob" }),
    "INVALID_INPUT",
  );
  await rejects(
    a.records.create("alpha", { module: "tasks" }),
    "INVALID_INPUT",
  );
  await rejects(a.records.list("alpha", "tasks", 101), "INVALID_INPUT");
  await rejects(
    o.configure("alpha", { modules: ["reporting"] }, 1),
    "INVALID_INPUT",
  );
  await rejects(
    o.configure("alpha", { features: { admin: true } }, 1),
    "INVALID_INPUT",
  );
  await rejects(o.configure("alpha", { modules: [] }, 2), "CONFLICT");
  assert.equal((await a.records.get("alpha", row.id)).version, 1);
});
test("invitations bind recipient, expire and are single use; no public audit mutation", async () => {
  const { a, b, g } = await setup();
  const invite = await a.invitations.create("alpha", "guest", "viewer");
  await rejects(b.invitations.accept(invite.token), "FORBIDDEN");
  await g.invitations.accept(invite.token);
  await rejects(g.invitations.accept(invite.token), "FORBIDDEN");
  assert.equal((await g.records.list("alpha", "tasks")).length, 1);
  assert.equal(a.auditEvents.append, undefined);
  await rejects(b.records.list("alpha", "tasks"), "FORBIDDEN");
  const events = await a.auditEvents.list("alpha");
  assert(events.some((e) => e.outcome === "FORBIDDEN"));
  assert(!JSON.stringify(events).includes(invite.token));
  let time = 0;
  const service = createOfflineBackend({ now: () => time });
  const admin = await service.fakeLogin("alice");
  const old = await admin.invitations.create("alpha", "guest", "staff");
  time = 3600001;
  const guest = await service.fakeLogin("guest");
  await rejects(guest.invitations.accept(old.token), "FORBIDDEN");
});

test("invitation acceptance is atomic under replay and respects issuer demotion", async () => {
  const { a, g } = await setup();
  const invite = await a.invitations.create("alpha", "guest", "viewer");
  const results = await Promise.allSettled([
    g.invitations.accept(invite.token),
    g.invitations.accept(invite.token),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (await a.memberships.list("alpha")).filter((m) => m.uid === "guest").length,
    1,
  );
  const service = createOfflineBackend();
  const admin = await service.fakeLogin("alice");
  const staff = await service.fakeLogin("staff");
  await admin.memberships.update(
    "alpha",
    "staff",
    { role: "organisation-admin" },
    1,
  );
  const pending = await staff.invitations.create("alpha", "guest", "viewer");
  await admin.memberships.update("alpha", "staff", { status: "revoked" }, 2);
  const guest = await service.fakeLogin("guest");
  await rejects(guest.invitations.accept(pending.token), "FORBIDDEN");
  await rejects(
    admin.memberships.update("alpha", "staff", { status: "active" }, 2),
    "CONFLICT",
  );
  await rejects(staff.records.list("alpha", "tasks"), "FORBIDDEN");
});
