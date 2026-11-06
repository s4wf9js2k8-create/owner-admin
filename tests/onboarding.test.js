import { test } from "node:test";
import assert from "node:assert/strict";
import { createOfflineBackend } from "../src/backend/offline.js";
const reject = (p, code) => assert.rejects(p, { code });
async function setup() {
  const service = createOfflineBackend();
  const [owner, a, b, v, g] = await Promise.all(
    ["owner", "alice", "bob", "viewer", "guest"].map((u) =>
      service.fakeLogin(u),
    ),
  );
  return { owner, a, b, v, g };
}
test("operator alone provisions companies and manages packages, branding, state and overrides", async () => {
  const { owner, a, b, v } = await setup();
  for (const client of [a, b, v]) {
    await reject(client.companies.list(), "FORBIDDEN");
    await reject(
      client.companies.create({
        name: "Attack",
        package: "Enterprise",
        color: "#112233",
      }),
      "FORBIDDEN",
    );
    await reject(
      client.companies.update("alpha", { package: "Enterprise" }, 1),
      "FORBIDDEN",
    );
    await reject(
      client.packages.update("Essential", { monthly: 20 }, 1),
      "FORBIDDEN",
    );
    await reject(client.approvals.list(), "FORBIDDEN");
    await reject(client.companies.inviteAdmin("alpha", "guest"), "FORBIDDEN");
  }
  const row = await owner.companies.create({
    name: "Fictional new company",
    package: "Professional",
    color: "#112233",
  });
  assert.deepEqual(row.modules, ["tasks", "reporting"]);
  assert.equal((await b.organisations.list()).length, 1);
  await reject(b.workspace.get(row.id), "FORBIDDEN");
  const updated = await owner.companies.update(
    "alpha",
    { color: "#123456", overrides: ["reporting"] },
    1,
  );
  assert.deepEqual(updated.modules, ["tasks", "reporting"]);
  assert.equal((await a.workspace.get("alpha")).color, "#123456");
  assert.equal((await b.workspace.get("beta")).color, "#28533a");
  await reject(
    owner.companies.update("alpha", { status: "suspended" }, 1),
    "CONFLICT",
  );
  await owner.companies.update("alpha", { status: "suspended" }, 2);
  await reject(a.workspace.get("alpha"), "FORBIDDEN");
  await owner.companies.update("alpha", { status: "active" }, 3);
  assert.equal((await a.workspace.get("alpha")).status, "active");
  await reject(owner.records.list("alpha", "tasks"), "FORBIDDEN");
});
test("package requests never self-enable features; approvals require owner and current versions", async () => {
  const { owner, a, b, v } = await setup();
  await reject(
    a.records.create("alpha", { module: "reporting", title: "Denied" }),
    "FORBIDDEN",
  );
  const request = await a.workspace.request("alpha", {
    package: "Professional",
  });
  assert.equal((await a.workspace.get("alpha")).package, "Essential");
  await reject(a.records.list("alpha", "reporting"), "FORBIDDEN");
  await reject(b.workspace.requests("alpha"), "FORBIDDEN");
  await reject(
    b.workspace.request("alpha", { package: "Enterprise" }),
    "FORBIDDEN",
  );
  await reject(
    v.workspace.request("alpha", { package: "Enterprise" }),
    "FORBIDDEN",
  );
  await reject(a.approvals.decide(request.id, "approved", 1, 1), "FORBIDDEN");
  await reject(
    owner.approvals.decide(request.id, "approved", 2, 1),
    "CONFLICT",
  );
  await reject(
    owner.approvals.decide(request.id, "approved", 1, 9),
    "CONFLICT",
  );
  await reject(
    a.workspace.request("alpha", { package: "Enterprise" }),
    "CONFLICT",
  );
  await owner.approvals.decide(request.id, "approved", 1, 1);
  assert.equal((await a.workspace.get("alpha")).package, "Professional");
  assert.equal((await b.workspace.get("beta")).package, "Essential");
  await a.records.create("alpha", { module: "reporting", title: "Approved" });
  await reject(
    owner.approvals.decide(request.id, "approved", 1, 2),
    "CONFLICT",
  );
  await owner.companies.update("alpha", { package: "Essential" }, 2);
  await reject(a.records.list("alpha", "reporting"), "FORBIDDEN");
  const second = await a.workspace.request("alpha", { package: "Enterprise" });
  await owner.approvals.decide(second.id, "rejected", 1, 3);
  assert.equal((await a.workspace.get("alpha")).package, "Essential");
});
test("template edits are versioned and do not retroactively change tenant entitlements", async () => {
  const { owner, a } = await setup();
  await owner.packages.update(
    "Essential",
    { modules: ["tasks", "reporting"], monthly: 15 },
    1,
  );
  assert.deepEqual((await a.workspace.get("alpha")).modules, ["tasks"]);
  const row = await owner.companies.create({
    name: "Synthetic template test",
    package: "Essential",
    color: "#223344",
  });
  assert.deepEqual(row.modules, ["tasks", "reporting"]);
  await reject(
    owner.packages.update("Essential", { monthly: 20 }, 1),
    "CONFLICT",
  );
  for (const patch of [
    { modules: ["reporting"] },
    { monthly: -1 },
    { monthly: 1.5 },
    { unknown: true },
  ])
    await reject(owner.packages.update("Essential", patch, 2), "INVALID_INPUT");
  await reject(
    owner.companies.update("alpha", { color: "red" }, 1),
    "INVALID_INPUT",
  );
  await reject(
    owner.companies.update("alpha", { overrides: ["unknown"] }, 1),
    "INVALID_INPUT",
  );
  await reject(
    a.workspace.request("alpha", { package: "Enterprise", role: "owner" }),
    "INVALID_INPUT",
  );
});
test("operator-issued admin invitation is recipient bound and isolated to the new company", async () => {
  const { owner, a, g } = await setup();
  const row = await owner.companies.create({
    name: "Synthetic invited company",
    package: "Essential",
    color: "#334455",
  });
  const invite = await owner.companies.inviteAdmin(row.id, "guest");
  await reject(a.invitations.accept(invite.token), "FORBIDDEN");
  await g.invitations.accept(invite.token);
  assert.equal((await g.workspace.get(row.id)).name, row.name);
  await reject(g.workspace.get("alpha"), "FORBIDDEN");
  assert.equal(
    (await g.memberships.list(row.id))[0].role,
    "organisation-admin",
  );
  await reject(g.invitations.accept(invite.token), "FORBIDDEN");
  await reject(g.companies.list(), "FORBIDDEN");
});

test("standalone feature requests require approval and preserve subscribed package", async () => {
  const { owner, a } = await setup();
  const request = await a.workspace.request("alpha", { feature: "reporting" });
  await reject(a.records.list("alpha", "reporting"), "FORBIDDEN");
  await reject(
    a.workspace.request("alpha", { feature: "unknown" }),
    "INVALID_INPUT",
  );
  await owner.approvals.decide(request.id, "approved", 1, 1);
  const org = await a.workspace.get("alpha");
  assert.equal(org.package, "Essential");
  assert.deepEqual(org.overrides, ["reporting"]);
  await a.records.create("alpha", {
    module: "reporting",
    title: "Approved feature",
  });
  await owner.companies.update("alpha", { overrides: [] }, 2);
  await reject(a.records.list("alpha", "reporting"), "FORBIDDEN");
});
