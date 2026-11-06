import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrganisation,
  starter,
  toggleModule,
  seedRecords,
  visibleRecords,
  updateRecord,
  modules,
} from "../src/model.js";
test("organisation creation validates fictional profile and copies sector configuration", () => {
  assert.throws(() => createOrganisation({ name: "   " }));
  assert.throws(() => createOrganisation({ name: "Valid", sector: "unknown" }));
  const o = createOrganisation({
    id: "new",
    name: "  Fictional works  ",
    sector: "engineering",
  });
  assert.equal(o.name, "Fictional works");
  assert.equal(o.status, "Trial");
  assert.ok(o.modules.includes("Work orders"));
  o.modules.length = 0;
  assert.ok(
    createOrganisation({ name: "Another", sector: "engineering" }).modules
      .length > 0,
  );
});
test("enabling dependent modules adds dependencies, disabling removes dependents", () => {
  assert.deepEqual(
    new Set(toggleModule([], "Attendance & Hours")),
    new Set(["Volunteers", "Attendance & Hours"]),
  );
  assert.deepEqual(
    toggleModule(["Volunteers", "Attendance & Hours", "Events"], "Volunteers"),
    ["Events"],
  );
  assert.deepEqual(
    new Set(toggleModule([], "Work orders")),
    new Set(["Assets", "Work orders"]),
  );
  assert.deepEqual(
    toggleModule(["Assets", "Work orders", "Inspections", "Staff"], "Assets"),
    ["Staff"],
  );
  assert.throws(() => toggleModule([], "Unknown"));
});
test("all sector presets satisfy catalogue dependencies", () => {
  for (const o of starter)
    for (const n of o.modules) {
      const m = modules.find((m) => m.name === n);
      assert.ok(m);
      for (const r of m.requires || []) assert.ok(o.modules.includes(r));
    }
});
test("demo record selectors scope organisation, entitlement and search", () => {
  const records = seedRecords(starter),
    o = starter[0];
  assert.ok(visibleRecords(records, o).length > 0);
  assert.ok(visibleRecords(records, o).every((r) => r.orgId === o.id));
  assert.equal(visibleRecords(records, { ...o, modules: [] }).length, 0);
  assert.equal(visibleRecords(records, o, null, "no such record").length, 0);
  assert.ok(visibleRecords(records, o, "Volunteers", "SAMPLE").length > 0);
});
test("record updates cannot change identity or modify another demo organisation", () => {
  const records = seedRecords(starter),
    r = records[0];
  assert.deepEqual(
    updateRecord(records, starter[1].id, r.id, { status: "Complete" }),
    records,
  );
  const next = updateRecord(records, r.orgId, r.id, {
    id: "bad",
    orgId: "bad",
    module: "bad",
    status: "Complete",
  });
  assert.deepEqual(next[0], { ...r, status: "Complete" });
  assert.equal(records[0].status, "Planned");
});
