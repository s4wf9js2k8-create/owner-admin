import test from "node:test";
import assert from "node:assert/strict";
import {
  authorizeRecord,
  membershipKey,
  moduleKey,
  recordKey,
} from "../proof-of-concepts/tenant-authorization/policy.js";
import { syntheticContext } from "../proof-of-concepts/tenant-authorization/fixtures.js";

const fields = () => ({
  title: "Synthetic task",
  detail: "Invented only",
  status: "Planned",
});
const request = (action = "read", orgId = "tenant-a") => ({
  action,
  target: {
    orgId,
    moduleId: "tasks",
    ...(action === "list"
      ? {}
      : { id: action === "create" ? "new-record" : "record-1" }),
  },
  ...(action === "list"
    ? { limit: 20 }
    : action === "create"
      ? { data: fields() }
      : action === "update"
        ? { data: { status: "Complete" } }
        : {}),
});
// A fake data boundary for tests only: deny before reading/mutating the Map.
// A real service must recheck current authority inside its database transaction.
function execute(context, input) {
  const grant = authorizeRecord(context, input);
  if (!grant.allowed) throw new Error("denied");
  const { orgId, moduleId, id } = grant.scope;
  const key = recordKey(orgId, moduleId, id);
  switch (input.action) {
    case "read":
      return structuredClone(context.records.get(key));
    case "list":
      return structuredClone(
        [...context.records.values()]
          .filter((r) => r.orgId === orgId && r.moduleId === moduleId)
          .slice(0, input.limit),
      );
    case "create":
      context.records.set(key, { ...input.data, ...grant.scope });
      break;
    case "update":
      context.records.set(key, { ...context.records.get(key), ...input.data });
      break;
    case "delete":
      context.records.delete(key);
      break;
  }
}
function deniedWithoutChange(context, input) {
  const before = structuredClone(context);
  assert.deepEqual(authorizeRecord(context, input), { allowed: false });
  assert.throws(() => execute(context, input), /denied/);
  assert.deepEqual(context, before);
}

test("policy: A and B members read/list/create/update their own synthetic records", () => {
  for (const [uid, orgId] of [
    ["alice", "tenant-a"],
    ["bob", "tenant-b"],
  ]) {
    const context = syntheticContext(uid);
    assert.equal(execute(context, request("read", orgId)).orgId, orgId);
    const rows = execute(context, request("list", orgId));
    assert.equal(rows.length, 1);
    assert.ok(rows.every((r) => r.orgId === orgId));
    execute(context, request("create", orgId));
    execute(context, request("update", orgId));
    assert.equal(execute(context, request("read", orgId)).status, "Complete");
  }
});
test("policy: cross-tenant read/list/create/update/delete are denied in both directions", () => {
  for (const [uid, orgId] of [
    ["alice", "tenant-b"],
    ["bob", "tenant-a"],
  ])
    for (const action of ["read", "list", "create", "update", "delete"])
      deniedWithoutChange(syntheticContext(uid), request(action, orgId));
});
test("policy: organisation admin has no implicit cross-tenant access", () => {
  const context = syntheticContext("admin");
  execute(context, request("delete"));
  assert.equal(
    context.records.has(recordKey("tenant-a", "tasks", "record-1")),
    false,
  );
  for (const action of ["read", "list", "create", "update", "delete"])
    deniedWithoutChange(context, request(action, "tenant-b"));
});
test("policy: viewer reads but cannot write, and member cannot delete", () => {
  const viewer = syntheticContext("reader");
  assert.ok(execute(viewer, request("read")));
  assert.equal(execute(viewer, request("list")).length, 1);
  for (const action of ["create", "update", "delete"])
    deniedWithoutChange(viewer, request(action));
  deniedWithoutChange(syntheticContext(), request("delete"));
});
test("policy: forged org/module/record identity and privilege fields in write bodies fail", () => {
  for (const action of ["create", "update"])
    for (const [key, value] of Object.entries({
      orgId: "tenant-b",
      moduleId: "assets",
      id: "record-2",
      role: "organisation-admin",
      uid: "bob",
    })) {
      const input = request(action);
      input.data[key] = value;
      deniedWithoutChange(syntheticContext(), input);
    }
});
test("policy: forged actor, role or membership in the request cannot grant authority", () => {
  for (const field of ["principal", "role", "membership", "claims"]) {
    const input = request("read", "tenant-b");
    input[field] = { uid: "bob", role: "organisation-admin", status: "active" };
    deniedWithoutChange(syntheticContext(), input);
  }
});
test("policy: stored identity mismatch and guessed record IDs fail without disclosure", () => {
  for (const patch of [
    { orgId: "tenant-b" },
    { moduleId: "assets" },
    { id: "other" },
  ]) {
    const context = syntheticContext();
    Object.assign(
      context.records.get(recordKey("tenant-a", "tasks", "record-1")),
      patch,
    );
    deniedWithoutChange(context, request());
  }
  const missing = request();
  missing.target.id = "does-not-exist";
  deniedWithoutChange(syntheticContext(), missing);
});
test("policy: revoked membership defeats a previously valid principal and stale role claims", () => {
  const context = syntheticContext();
  context.principal.role = "organisation-admin";
  assert.equal(authorizeRecord(context, request()).allowed, true);
  context.memberships.get(membershipKey("tenant-a", "alice")).status =
    "revoked";
  for (const action of ["read", "list", "create", "update", "delete"])
    deniedWithoutChange(context, request(action));
  context.memberships.delete(membershipKey("tenant-a", "alice"));
  deniedWithoutChange(context, request());
});
test("policy: disabling a module after a successful read denies every later operation", () => {
  const context = syntheticContext("admin");
  assert.ok(execute(context, request()));
  context.entitlements.get(moduleKey("tenant-a", "tasks")).enabled = false;
  for (const action of ["read", "list", "create", "update", "delete"])
    deniedWithoutChange(context, request(action));
  assert.equal(context.records.size, 2); // retained data does not imply access
});
test("policy: unauthenticated, unknown and suspended accounts or tenants are denied", () => {
  for (const context of [syntheticContext(null), syntheticContext("unknown")])
    for (const action of ["read", "list", "create", "update", "delete"])
      deniedWithoutChange(context, request(action));
  for (const collection of ["accounts", "organisations"]) {
    const context = syntheticContext();
    context[collection].get(
      collection === "accounts" ? "alice" : "tenant-a",
    ).status = "suspended";
    for (const action of ["read", "list", "create", "update", "delete"])
      deniedWithoutChange(context, request(action));
  }
});
test("policy: incomplete or inconsistent authoritative state defaults to deny", () => {
  for (const field of [
    "accounts",
    "organisations",
    "memberships",
    "entitlements",
    "records",
  ]) {
    const context = syntheticContext();
    delete context[field];
    deniedWithoutChange(context, request());
  }
  for (const patch of [
    { uid: "bob" },
    { orgId: "tenant-b" },
    { role: "platform-admin" },
    { role: "unknown" },
  ]) {
    const context = syntheticContext();
    Object.assign(
      context.memberships.get(membershipKey("tenant-a", "alice")),
      patch,
    );
    deniedWithoutChange(context, request());
  }
  for (const patch of [
    { orgId: "tenant-b" },
    { moduleId: "assets" },
    { enabled: "true" },
  ]) {
    const context = syntheticContext();
    Object.assign(
      context.entitlements.get(moduleKey("tenant-a", "tasks")),
      patch,
    );
    deniedWithoutChange(context, request());
  }
});
test("policy: malformed addresses, wildcards and unknown actions cannot widen scope", () => {
  for (const value of [null, "", "*", "../tenant-b", "tenant-a/tasks", 42]) {
    const input = request();
    input.target.orgId = value;
    deniedWithoutChange(syntheticContext(), input);
  }
  for (const input of [
    null,
    {},
    { ...request(), action: "exportAll" },
    { ...request(), target: {} },
    { ...request(), target: { ...request().target, path: "tenant-b" } },
  ])
    deniedWithoutChange(syntheticContext(), input);
});
test("policy: unbounded or record-addressed lists and invalid schemas fail", () => {
  for (const limit of [undefined, 0, -1, 101, 1.5, "20"]) {
    const input = request("list");
    input.limit = limit;
    deniedWithoutChange(syntheticContext(), input);
  }
  deniedWithoutChange(syntheticContext(), {
    ...request("list"),
    target: request().target,
  });
  for (const data of [
    {},
    { title: "" },
    { title: "x".repeat(101) },
    { status: "Granted" },
    { detail: null },
    { orgId: "tenant-a" },
  ])
    deniedWithoutChange(syntheticContext(), { ...request("update"), data });
  deniedWithoutChange(syntheticContext(), {
    ...request("create"),
    data: { title: "Missing fields" },
  });
  deniedWithoutChange(syntheticContext(), {
    ...request("read"),
    data: fields(),
  });
});
test("policy: creates cannot overwrite existing IDs and decisions do not mutate state", () => {
  const context = syntheticContext();
  const before = structuredClone(context);
  const input = request("create");
  input.target.id = "record-1";
  deniedWithoutChange(context, input);
  const grant = authorizeRecord(context, request("update"));
  assert.equal(grant.allowed, true);
  grant.scope.orgId = "tenant-b";
  assert.deepEqual(context, before);
});
