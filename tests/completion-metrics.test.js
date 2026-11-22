import test from "node:test";
import assert from "node:assert/strict";
import { visitorSummary, leaveBalances } from "../src/completion/metrics.js";
import { weeklyHours } from "../src/timeReporting.js";
import { illustrativeAmount } from "../src/owner/rules.js";
import { reportSpreadsheet } from "../src/reportingRules.js";
test("visitor summaries calculate selected category and dates without arbitrary totals", () => {
  const rows = [
    { date: "2026-11-10", category: "Child", count: 8 },
    { date: "2026-11-11", category: "Child", count: 9 },
    { date: "2026-11-10", category: "Adult", count: 20 },
  ];
  const r = visitorSummary(rows, "2026-11-10", "2026-11-11", "Child");
  assert.equal(r.total, 17);
  assert.deepEqual(r.categories, [["Child", 17]]);
  assert.equal(visitorSummary(rows, "2026-11-11", "2026-11-11").total, 9);
});
test("leave balances deduplicate overlapping approved weekdays and ignore pending leave", () => {
  const records = [
    {
      personId: "p",
      approval: "Approved",
      startDate: "2026-11-20",
      endDate: "2026-11-24",
    },
    {
      personId: "p",
      approval: "Approved",
      startDate: "2026-11-23",
      endDate: "2026-11-25",
    },
    {
      personId: "p",
      approval: "Pending",
      startDate: "2026-11-26",
      endDate: "2026-11-27",
    },
  ];
  const r = leaveBalances(records, [{ id: "p", title: "Person" }], "2026", 25);
  assert.equal(r[0].used, 4);
  assert.equal(r[0].remaining, 21);
});
test("weekly overtime uses configured threshold and linked person identity", () => {
  const rows = weeklyHours(
    [
      {
        personId: "p",
        person: "Person",
        startTime: "2026-11-23T09:00",
        endTime: "2026-11-23T18:00",
        breakMinutes: 60,
      },
    ],
    "2026-11-23",
    7,
  );
  assert.equal(rows[0].total, 8);
  assert.equal(rows[0].overtime, 1);
});
test("illustrative add-ons use monthly and annual periods and respect negotiated base price", () => {
  const p = [
      {
        name: "Demo",
        monthly: 100,
        annual: 1000,
        includedModules: ["Staff"],
        addons: [
          { module: "Staff", monthly: 9 },
          { module: "Fleet", monthly: 12.5 },
        ],
      },
    ],
    o = {
      plan: "Demo",
      cycle: "Monthly",
      subscriptionAddons: ["Staff", "Fleet"],
    };
  assert.equal(illustrativeAmount(o, p), 112.5);
  assert.equal(illustrativeAmount({ ...o, cycle: "Annual" }, p), 1150);
  assert.equal(illustrativeAmount({ ...o, negotiatedPrice: 80 }, p), 92.5);
});
test("Excel XML export preserves filtered selected columns, escaping and data-only cells", () => {
  const r = {
    accepted: [
      {
        record: {
          title: '=1+1 <tag> & "quoted"\nnext',
          module: "Tasks & projects",
          dueDate: "2026-11-10",
          status: "Planned",
        },
        value: 4,
      },
    ],
  };
  const xml = reportSpreadsheet(r, { fields: ["title", "value"] }, []);
  assert.match(xml, /Worksheet ss:Name="Report"/);
  assert.match(xml, /&lt;tag&gt; &amp; &quot;quoted&quot;\nnext/);
  assert.match(xml, /<Data ss:Type="String">4<\/Data>/);
  assert.doesNotMatch(xml, /Formula|Department/);
});

test("timesheet CSV labels the configured overtime threshold", async () => {
  const { timesheetCsv } = await import("../src/timeReporting.js");
  assert.match(timesheetCsv([], 37.5), /Over 37.5 hours/);
  assert.doesNotMatch(timesheetCsv([], 37.5), /Over 40 hours/);
});

test("inspection template versions advance new, legacy and previously versioned templates", async () => {
  const { nextInspectionTemplateVersion } =
    await import("../src/inspectionRules.js");
  assert.equal(nextInspectionTemplateVersion(null), 1);
  assert.equal(nextInspectionTemplateVersion({ title: "Legacy" }), 2);
  assert.equal(nextInspectionTemplateVersion({ version: 3 }), 4);
});
