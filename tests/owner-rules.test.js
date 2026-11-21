import test from "node:test";
import assert from "node:assert/strict";
import {
  ownerPageAllowed,
  ownerCanManage,
  ownerCanSupport,
  illustrativeAmount,
  reorder,
  dashboardWidgetsFor,
} from "../src/owner/rules.js";
test("owner role templates deny unknown and restricted pages", () => {
  assert.equal(ownerPageAllowed("Support Agent", "Support"), true);
  assert.equal(ownerPageAllowed("Support Agent", "Modules"), false);
  assert.equal(ownerCanManage("Sales Representative"), false);
  assert.equal(ownerCanSupport("Sales Representative"), false);
  assert.equal(ownerPageAllowed("unknown", "Overview"), false);
  assert.equal(ownerPageAllowed("Read-only Auditor", "Support"), true);
});
test("company pricing uses configured billing frequency and negotiated amount without external payments", () => {
  const plans = [{ name: "Bespoke", monthly: 45, annual: 450 }];
  assert.equal(
    illustrativeAmount({ plan: "Bespoke", cycle: "Annual" }, plans),
    450,
  );
  assert.equal(
    illustrativeAmount(
      { plan: "Bespoke", cycle: "Annual", negotiatedPrice: 375 },
      plans,
    ),
    375,
  );
  assert.equal(illustrativeAmount({ plan: "missing" }, plans), null);
});
test("dashboard reorder preserves widgets at boundaries and industry preset values", () => {
  assert.deepEqual(reorder(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(reorder(["a", "b"], "a", -1), ["a", "b"]);
  assert.ok(dashboardWidgetsFor("Visitor").includes("visitors"));
});
test("annual negotiated amounts convert correctly to a monthly equivalent", async () => {
  const { monthlyEquivalent } = await import("../src/owner/rules.js");
  assert.equal(
    monthlyEquivalent({ plan: "P", cycle: "Annual", negotiatedPrice: 360 }, [
      { name: "P", monthly: 50, annual: 500 },
    ]),
    30,
  );
});
test("support and sales can change only their own operational areas", async () => {
  const { ownerCanWritePage } = await import("../src/owner/rules.js");
  assert.equal(ownerCanWritePage("Support Agent", "Feature Requests"), true);
  assert.equal(ownerCanWritePage("Support Agent", "Product Roadmap"), false);
  assert.equal(ownerCanWritePage("Sales Representative", "Sales Leads"), true);
  assert.equal(ownerCanWritePage("Read-only Auditor", "Support"), false);
});
