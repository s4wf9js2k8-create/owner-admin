import test from "node:test";
import assert from "node:assert/strict";
import { createFictionalBackend } from "../src/backend/fictional.js";
import { qualifiedCoverage, refundDue } from "../src/completion/finalRules.js";
import { financialTotals, balancePence } from "../src/financialRules.js";
import { eventAttendance, eventUsage } from "../src/scheduling/rules.js";
import { buildReport } from "../src/reportingRules.js";
import { ownerPageAllowed, ownerCanWritePage } from "../src/owner/rules.js";
const org = {
  id: "o",
  modules: [
    "Staff & volunteers",
    "Training and qualifications",
    "Shift rotas",
    "Inspections",
    "Assets & equipment",
    "Leave and availability",
    "Quotes and invoices",
    "Events & bookings",
    "Customers / CRM",
    "Attendance & timesheets",
    "Tasks & projects",
  ],
};
const p = (n) => ({
    id: "p" + n,
    orgId: "o",
    module: "Staff & volunteers",
    title: "Person " + n,
    employmentStatus: "Active",
  }),
  people = [p(1), p(2), p(3)];
const q = (n, name = "Vehicle driving") => ({
  id: "q" + n + name,
  orgId: "o",
  module: "Training and qualifications",
  personId: "p" + n,
  qualification: name,
  approval: "Approved",
  noExpiry: true,
});
const shift = (id, personId, start, end) => ({
  id,
  orgId: "o",
  module: "Shift rotas",
  title: id,
  personId,
  person: people.find((p) => p.id === personId)?.title,
  startTime: "2027-04-01T" + start,
  endTime: "2027-04-01T" + end,
  status: "Planned",
});
const api = (rows) =>
  createFictionalBackend({
    fixtures: () => ({
      orgs: [org],
      records: [...people, ...rows],
      plans: [],
      tickets: [],
      flags: {},
      logs: [],
    }),
  });
test("competency coverage measures concurrent eligible people throughout the required window", () => {
  const shifts = [
      shift("s1", "p1", "09:00", "17:00"),
      shift("s2", "p2", "13:00", "17:00"),
    ],
    records = [...people, q(1), q(2), ...shifts];
  assert.equal(
    qualifiedCoverage(records, "o", shifts, "2027-04-01", {
      qualification: "Vehicle driving",
      start: "09:00",
      end: "17:00",
    }),
    1,
  );
  assert.equal(
    qualifiedCoverage(records, "o", shifts, "2027-04-01", {
      qualification: "Vehicle driving",
      start: "13:00",
      end: "17:00",
    }),
    2,
  );
});
test("shift exchange rejects self review/conflicts atomically, then updates both assignments once", async () => {
  const b = api([
    shift("one", "p1", "09:00", "12:00"),
    shift("two", "p2", "13:00", "17:00"),
    shift("conflict", "p1", "14:00", "15:00"),
  ]);
  await b.records.update("o", "one", {
    _actor: { actorId: "p1" },
    _workflow: {
      kind: "requestSwap",
      targetId: "two",
      reason: "Exchange duties",
    },
  });
  await assert.rejects(
    b.records.update("o", "one", {
      _actor: { actorId: "p1" },
      _workflow: {
        kind: "decideSwap",
        reviewerId: "p1",
        decision: "Approve",
        comment: "Review",
      },
    }),
    /self-approval/,
  );
  await assert.rejects(
    b.records.update("o", "one", {
      _actor: { actorId: "p3" },
      _workflow: {
        kind: "decideSwap",
        reviewerId: "p3",
        decision: "Approve",
        comment: "Review",
      },
    }),
    /Overlapping/,
  );
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "one").personId,
    "p1",
  );
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "two").personId,
    "p2",
  );
  await b.records.update("o", "conflict", { status: "Cancelled" });
  await b.records.update("o", "one", {
    _actor: { actorId: "p3" },
    _workflow: {
      kind: "decideSwap",
      reviewerId: "p3",
      decision: "Approve",
      comment: "Coverage checked",
    },
  });
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "one").personId,
    "p2",
  );
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "two").personId,
    "p1",
  );
  await assert.rejects(
    b.records.update("o", "one", {
      _actor: { actorId: "p3" },
      _workflow: {
        kind: "decideSwap",
        reviewerId: "p3",
        decision: "Approve",
        comment: "Again",
      },
    }),
    /already/,
  );
});
test("inspection recurrence retains questions, validates inspectors and deduplicates dates", async () => {
  const source = {
    id: "inspection",
    orgId: "o",
    module: "Inspections",
    title: "Safety check",
    inspectorId: "p1",
    inspectionQuestions: [
      { id: "guard", label: "Guard secure", type: "Pass / fail" },
    ],
    status: "Complete",
    result: "Pass",
    dueDate: "2027-03-01",
  };
  const b = api([q(1, "Safety inspection"), source]);
  const c = {
    kind: "repeatInspection",
    from: "2027-04-01",
    to: "2027-04-15",
    interval: 7,
  };
  await b.records.update("o", "inspection", { _workflow: c });
  await b.records.update("o", "inspection", { _workflow: c });
  const generated = b
    .getSnapshot()
    .records.filter((r) => r.repeatSourceId === "inspection");
  assert.equal(generated.length, 3);
  assert.equal(generated[0].inspectionQuestions[0].label, "Guard secure");
  assert.equal(generated[0].result, "Pending");
});
const invoice = {
  id: "invoice",
  orgId: "o",
  module: "Quotes and invoices",
  recordType: "invoice",
  title: "Invoice",
  documentStatus: "Issued",
  totals: financialTotals([
    { description: "Service", quantity: 1, rate: 100, vat: 0 },
  ]),
  payments: [{ id: "pay", amountPence: 10000 }],
  credits: [],
};
test("paid invoice correction creates a refundable credit and refund preserves correct net balance", async () => {
  const b = api([invoice]);
  await b.records.update("o", "invoice", {
    _workflow: {
      kind: "creditInvoice",
      amount: "80",
      reference: "Service reduction",
      date: "2026-11-20",
    },
  });
  let r = b.getSnapshot().records.find((r) => r.id === "invoice");
  assert.equal(refundDue(r), 8000);
  await assert.rejects(
    b.records.update("o", "invoice", {
      _workflow: {
        kind: "refundInvoice",
        amount: "90",
        reference: "Refund",
        date: "2026-11-20",
      },
    }),
    /exceeds/,
  );
  await b.records.update("o", "invoice", {
    _workflow: {
      kind: "refundInvoice",
      amount: "80",
      reference: "Fictional refund",
      date: "2026-11-20",
    },
  });
  r = b.getSnapshot().records.find((r) => r.id === "invoice");
  assert.equal(refundDue(r), 0);
  assert.equal(balancePence(r), 0);
  assert.equal(r.payments[0].amountPence, 10000);
  assert.equal(r.refunds[0].amountPence, 8000);
});
test("individual visitor check-in and cancellation update attendance/capacity and linked invoice exactly once", async () => {
  const event = {
      id: "event",
      orgId: "o",
      module: "Events & bookings",
      recordType: "event",
      title: "Session",
      capacity: 2,
    },
    booking = {
      id: "booking",
      orgId: "o",
      module: "Events & bookings",
      recordType: "booking",
      title: "Group",
      eventId: "event",
      invoiceId: "invoice",
      guests: 2,
      bookingStatus: "Confirmed",
      attendees: [
        { id: "a", name: "Sample A" },
        { id: "b", name: "Sample B" },
      ],
    };
  const b = api([invoice, event, booking]);
  await b.records.update("o", "booking", {
    _workflow: { kind: "checkAttendee", attendeeId: "a" },
  });
  assert.equal(eventAttendance(b.getSnapshot().records, "event"), 1);
  await assert.rejects(
    b.records.update("o", "booking", {
      _workflow: { kind: "checkAttendee", attendeeId: "a" },
    }),
    /already/,
  );
  await b.records.update("o", "booking", {
    _workflow: { kind: "cancelReservation" },
  });
  await b.records.update("o", "booking", {
    _workflow: { kind: "cancelReservation" },
  });
  assert.equal(eventUsage(b.getSnapshot().records, "event"), 0);
  assert.equal(eventAttendance(b.getSnapshot().records, "event"), 0);
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "invoice").credits.length,
    1,
  );
});
test("attendance rejects overlapping sessions and impossible breaks", async () => {
  const row = {
    id: "time",
    orgId: "o",
    module: "Attendance & timesheets",
    personId: "p1",
    person: "Person 1",
    startTime: "2027-04-01T09:00",
    endTime: "2027-04-01T17:00",
    breakMinutes: 30,
  };
  const b = api([row]);
  await assert.rejects(
    b.records.create("o", {
      ...row,
      startTime: "2027-04-01T10:00",
      endTime: "2027-04-01T12:00",
    }),
    /overlaps/,
  );
  await assert.rejects(
    b.records.update("o", "time", { breakMinutes: 900 }),
    /Breaks/,
  );
});
test("custom owner roles cannot write hidden or read-only pages or grant auditor writes", () => {
  const policy = {
    customRoles: [
      { name: "Pricing editor", base: "Platform Administrator" },
      { name: "Observer", base: "Read-only Auditor" },
    ],
    roles: {
      "Pricing editor": {
        disabledPages: ["Modules"],
        disabledWrites: ["Subscriptions"],
      },
    },
  };
  assert.equal(ownerPageAllowed("Pricing editor", "Modules", policy), false);
  assert.equal(
    ownerCanWritePage("Pricing editor", "Subscriptions", policy),
    false,
  );
  assert.equal(ownerCanWritePage("Pricing editor", "Settings", policy), true);
  assert.equal(ownerCanWritePage("Observer", "Settings", policy), false);
});
test("overtime includes earlier same-week hours when the report date range is narrower", () => {
  const rows = [
    {
      id: "a",
      orgId: "o",
      module: "Attendance & timesheets",
      personId: "p1",
      startTime: "2027-04-05T09:00",
      endTime: "2027-04-05T17:00",
    },
    {
      id: "b",
      orgId: "o",
      module: "Attendance & timesheets",
      personId: "p1",
      startTime: "2027-04-06T09:00",
      endTime: "2027-04-06T13:00",
    },
  ];
  const result = buildReport(rows, "o", {
    source: "Attendance & timesheets",
    metric: "overtime",
    overtimeThreshold: 8,
    from: "2027-04-06",
    to: "2027-04-06",
  });
  assert.equal(result.total, 4);
  const project = {
    id: "project",
    orgId: "o",
    module: "Tasks & projects",
    recordType: "project",
    title: "Project",
    budget: 500,
    costs: [{ amount: 100 }],
  };
  assert.equal(
    buildReport(
      [
        project,
        {
          id: "t",
          orgId: "o",
          module: "Tasks & projects",
          projectId: "project",
          status: "Complete",
        },
      ],
      "o",
      { source: "Tasks & projects", metric: "progress" },
    ).total,
    100,
  );
});
test("overtime splits overnight sessions at week and report boundaries", () => {
  const rows = [
    {
      id: "sun",
      orgId: "o",
      module: "Attendance & timesheets",
      personId: "p1",
      startTime: "2027-04-11T20:00",
      endTime: "2027-04-12T04:00",
      breakMinutes: 0,
    },
  ];
  assert.equal(
    buildReport(rows, "o", {
      source: "Attendance & timesheets",
      metric: "overtime",
      overtimeThreshold: 2,
    }).total,
    4,
  );
  assert.equal(
    buildReport(rows, "o", {
      source: "Attendance & timesheets",
      metric: "overtime",
      overtimeThreshold: 2,
      from: "2027-04-12",
      to: "2027-04-12",
    }).total,
    2,
  );
});
