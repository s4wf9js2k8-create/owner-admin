import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createOfflineBackend } from "../src/backend/offline.js";
import {
  createFirebaseAdapter,
  createOfflineFirebaseTransport,
  firebasePreparationConfig,
} from "../src/backend/firebase.js";
const reject = (p, code) => assert.rejects(p, { code });
async function setup() {
  const harness = createOfflineBackend();
  const adapt = async (uid) =>
    createFirebaseAdapter({
      transport: createOfflineFirebaseTransport(await harness.fakeLogin(uid)),
    });
  return {
    a: await adapt("alice"),
    b: await adapt("bob"),
    v: await adapt("viewer"),
    owner: await harness.fakeLogin("owner"),
    admin: await harness.fakeLogin("alice"),
    anonymous: createFirebaseAdapter({
      transport: createOfflineFirebaseTransport(harness.anonymous()),
    }),
  };
}
test("Firebase preparation refuses live config and missing transports", () => {
  assert.equal(firebasePreparationConfig().projectId, "demo-channel-systems");
  for (const env of [
    { CHANNEL_FIREBASE_PROJECT_ID: "real-project" },
    { CHANNEL_FIREBASE_MODE: "production" },
    { CHANNEL_FIREBASE_PROJECT_ID: "demo-other" },
    { CHANNEL_FIREBASE_PROJECT_ID: "demo-channel-systems/escape" },
  ])
    assert.throws(() => firebasePreparationConfig(env), {
      code: "INVALID_INPUT",
    });
  assert.throws(() => createFirebaseAdapter(), { code: "INVALID_INPUT" });
  assert.throws(
    () => createFirebaseAdapter({ transport: { kind: "live", execute() {} } }),
    { code: "INVALID_INPUT" },
  );
});
test("Firebase ports preserve offline CRUD, version conflicts and detached values", async () => {
  const { a } = await setup();
  assert.deepEqual(await a.auth.getSession(), { uid: "alice", mocked: true });
  const row = await a.records.create("alpha", {
    module: "tasks",
    title: "Synthetic Firebase contract",
  });
  row.title = "tampered";
  assert.equal(
    (await a.records.get("alpha", row.id)).title,
    "Synthetic Firebase contract",
  );
  const changed = await a.records.update("alpha", row.id, { progress: 100 }, 1);
  assert.equal(changed.version, 2);
  await reject(
    a.records.update("alpha", row.id, { title: "Stale" }, 1),
    "CONFLICT",
  );
  assert.equal((await a.records.list("alpha", "tasks")).length, 1);
  await a.records.delete("alpha", row.id, 2);
  await reject(a.records.get("alpha", row.id), "NOT_FOUND");
  await a.auth.logout();
  await reject(a.records.list("alpha", "tasks"), "UNAUTHENTICATED");
});
test("Firebase boundary denies cross-tenant operations in both directions", async () => {
  const { a, b } = await setup();
  for (const [own, other, org, foreign] of [
    [a, b, "alpha", "beta"],
    [b, a, "beta", "alpha"],
  ]) {
    const row = await own.records.create(org, {
      module: "tasks",
      title: "Private synthetic task",
    });
    for (const call of [
      () => other.records.list(org, "tasks"),
      () => other.records.get(org, row.id),
      () => other.records.create(org, { module: "tasks", title: "Attack" }),
      () => other.records.update(org, row.id, { title: "Attack" }, 1),
      () => other.records.delete(org, row.id, 1),
    ])
      await reject(call(), "FORBIDDEN");
    await reject(other.records.get(foreign, row.id), "NOT_FOUND");
  }
});
test("Firebase requests recheck membership and modules and reject anonymous/role writes", async () => {
  const { a, v, owner, admin, anonymous } = await setup();
  await reject(anonymous.records.list("alpha", "tasks"), "UNAUTHENTICATED");
  await reject(
    v.records.create("alpha", { module: "tasks", title: "Attack" }),
    "FORBIDDEN",
  );
  await admin.memberships.update("alpha", "viewer", { status: "revoked" }, 1);
  await reject(v.records.list("alpha", "tasks"), "FORBIDDEN");
  const row = await a.records.create("alpha", {
    module: "tasks",
    title: "Retained",
  });
  await owner.configure("alpha", { modules: [] }, 1);
  await reject(a.records.get("alpha", row.id), "FORBIDDEN");
  await reject(a.records.list("alpha", "tasks"), "FORBIDDEN");
});
test("Firebase validation blocks forged authority, malformed paths, input and versions before transport", async () => {
  let calls = 0;
  const adapter = createFirebaseAdapter({
    transport: {
      kind: "offline-firebase-transport",
      execute: async () => {
        calls++;
        return {};
      },
    },
  });
  for (const values of [
    { module: "tasks", title: "X", orgId: "beta" },
    { module: "tasks", title: "X", role: "owner" },
    { module: "tasks", title: "" },
    { module: "tasks", title: "x".repeat(101) },
    { module: "tasks", title: "X", progress: 101 },
    { module: "../tasks", title: "X" },
  ])
    await reject(adapter.records.create("alpha", values), "INVALID_INPUT");
  await reject(adapter.records.list("../beta", "tasks"), "INVALID_INPUT");
  await reject(adapter.records.list("alpha", "tasks", 101), "INVALID_INPUT");
  await reject(adapter.records.get("alpha", "a/b"), "INVALID_INPUT");
  await reject(
    adapter.records.update("alpha", "id", { module: "tasks" }, 1),
    "INVALID_INPUT",
  );
  await reject(adapter.records.delete("alpha", "id", 0), "INVALID_INPUT");
  assert.equal(calls, 0);
});
test("Firebase transport errors become stable redacted errors", async () => {
  for (const [upstream, code] of [
    ["permission-denied", "FORBIDDEN"],
    ["aborted", "CONFLICT"],
    ["auth/user-token-expired", "UNAUTHENTICATED"],
    ["not-found", "NOT_FOUND"],
    ["invalid-argument", "INVALID_INPUT"],
    ["unavailable", "UNAVAILABLE"],
    ["internal-secret", "UNAVAILABLE"],
  ]) {
    const a = createFirebaseAdapter({
      transport: {
        kind: "offline-firebase-transport",
        execute: async () => {
          throw Object.assign(new Error("SECRET"), { code: upstream });
        },
      },
    });
    await assert.rejects(
      a.records.list("alpha", "tasks"),
      (e) =>
        e.code === code && e.message === code && !e.message.includes("SECRET"),
    );
  }
});
test("transport commands are detached and deny unknown operations", async () => {
  const { a } = await setup();
  const transport = createOfflineFirebaseTransport(a);
  await reject(
    transport.execute({ operation: "auditEvents.append", args: [] }),
    "FORBIDDEN",
  );
  let captured;
  const adapter = createFirebaseAdapter({
    transport: {
      kind: "offline-firebase-transport",
      execute: async (command) => {
        captured = command;
        return {};
      },
    },
  });
  const values = { module: "tasks", title: "Before" };
  const pending = adapter.records.create("alpha", values);
  values.title = "After";
  await pending;
  assert.equal(captured.args[0].title, "Before");
  assert.equal(captured.orgId, "alpha");
  assert.equal(captured.projectId, "demo-channel-systems");
});
test("draft Rules remain literal deny-all and are not wired into deployment (static regression guard, not emulator)", () => {
  const rules = readFileSync(
    new URL("../firebase/draft/firestore.rules", import.meta.url),
    "utf8",
  )
    .replace(/\/\/[^\n]*/g, "")
    .trim();
  assert.match(
    rules,
    /^rules_version = '2';\s*service cloud\.firestore\s*\{\s*match \/databases\/\{database\}\/documents\s*\{\s*match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}\s*\}\s*\}$/,
  );
  const workflow = readFileSync(
    new URL("../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  );
  assert(!workflow.includes("firebase"));
});
