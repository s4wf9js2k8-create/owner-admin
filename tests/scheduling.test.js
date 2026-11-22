import test from "node:test";
import assert from "node:assert/strict";
import { createFictionalBackend } from "../src/backend/fictional.js";
import {
  eventUsage,
  eventAttendance,
  validateScheduledRecord,
  calendarDays,
  validDateTime,
} from "../src/scheduling/rules.js";
import { buildReport, reportCsv, reportDate } from "../src/reportingRules.js";
const org = {
  id: "o",
  name: "Fictional business",
  modules: [
    "Events & bookings",
    "Bookings and appointments",
    "Staff & volunteers",
    "Customers / CRM",
    "Assets & equipment",
    "Quotes and invoices",
    "Tasks & projects",
    "Leave and availability",
  ],
  workspaceConfig: {},
};
const staff = {
  id: "person",
  orgId: "o",
  module: "Staff & volunteers",
  title: "Sample Person",
  employmentStatus: "Active",
};
const other = { ...staff, id: "other", title: "Sample Other" };
const customer = {
  id: "customer",
  orgId: "o",
  module: "Customers / CRM",
  title: "Fictional customer",
  contacts: [{ id: "contact", name: "Sample contact" }],
};
const asset = {
  id: "equipment",
  orgId: "o",
  module: "Assets & equipment",
  title: "Portable projector",
  condition: "Good",
};
const event = {
  id: "event",
  orgId: "o",
  module: "Events & bookings",
  recordType: "event",
  schedulingVersion: 1,
  title: "Demo session",
  startTime: "2026-12-10T09:00",
  endTime: "2026-12-10T11:00",
  capacity: 4,
  staffIds: ["person"],
  resourceIds: ["equipment"],
  status: "Planned",
};
const booking = {
  id: "booking",
  orgId: "o",
  module: "Events & bookings",
  recordType: "booking",
  schedulingVersion: 1,
  eventId: "event",
  customerId: "customer",
  title: "Demo group",
  guests: 3,
  unitPrice: 5,
  bookingStatus: "Confirmed",
  status: "Planned",
};
const fixture = (records = []) => ({
  orgs: [org],
  records: [staff, other, customer, asset, event, ...records],
  plans: [],
  flags: {},
  logs: [],
  tickets: [],
});
const api = (records) =>
  createFictionalBackend({ fixtures: () => fixture(records) });
const appointment = (values = {}) => ({
  orgId: "o",
  module: "Bookings and appointments",
  recordType: "appointment",
  schedulingVersion: 1,
  title: "Consultation",
  startTime: "2026-12-11T09:00",
  endTime: "2026-12-11T10:00",
  customerId: "customer",
  bookingType: "Customer visit",
  personId: "person",
  resourceIds: [],
  status: "Confirmed",
  ...values,
});
test("capacity is enforced atomically and cancelled places become available without deleting history", async () => {
  const b = api([booking]);
  await assert.rejects(
    b.records.create("o", { ...booking, id: undefined, guests: 2 }),
    /Not enough places/,
  );
  assert.equal(
    b.getSnapshot().records.filter((r) => r.recordType === "booking").length,
    1,
  );
  await b.records.update("o", "booking", {
    bookingStatus: "Cancelled",
    status: "Cancelled",
  });
  const saved = await b.records.create("o", {
    ...booking,
    id: undefined,
    guests: 4,
  });
  assert.equal(eventUsage(b.getSnapshot().records, "event"), 4);
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "booking").bookingStatus,
    "Cancelled",
  );
  assert.ok(saved.id);
});
test("concurrent attempts cannot reserve the same remaining places twice", async () => {
  const b = api([booking]);
  const result = await Promise.allSettled([
    b.records.create("o", { ...booking, guests: 1 }),
    b.records.create("o", { ...booking, guests: 1 }),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(eventUsage(b.getSnapshot().records, "event"), 4);
});
test("waitlist cannot bypass confirmation and repeated check-in never adds attendance", async () => {
  const b = api([{ ...booking, bookingStatus: "Waitlist" }]);
  await assert.rejects(
    b.records.update("o", "booking", { bookingStatus: "Checked in" }),
    /Confirm the reservation/,
  );
  await b.records.update("o", "booking", { bookingStatus: "Confirmed" });
  await b.records.update("o", "booking", { bookingStatus: "Checked in" });
  await b.records.update("o", "booking", { bookingStatus: "Checked in" });
  assert.equal(eventAttendance(b.getSnapshot().records, "event"), 3);
  await b.records.update("o", "booking", {
    bookingStatus: "Cancelled",
    status: "Cancelled",
  });
  assert.equal(eventAttendance(b.getSnapshot().records, "event"), 0);
});
test("event capacity reductions and cancellations reject active reservations", async () => {
  const b = api([booking]);
  await assert.rejects(
    b.records.update("o", "event", { capacity: 2 }),
    /below the places/,
  );
  await assert.rejects(
    b.records.update("o", "event", { status: "Cancelled" }),
    /Cancel active bookings/,
  );
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "event").capacity,
    4,
  );
});
test("appointments, events and equipment reservations share staff and resource conflict checks", async () => {
  const b = api();
  await assert.rejects(
    b.records.create(
      "o",
      appointment({ startTime: event.startTime, endTime: event.endTime }),
    ),
    /Overlapping/,
  );
  await assert.rejects(
    b.records.create(
      "o",
      appointment({
        personId: "other",
        resourceIds: ["equipment"],
        startTime: event.startTime,
        endTime: event.endTime,
      }),
    ),
    /already reserved/,
  );
  const saved = await b.records.create(
    "o",
    appointment({
      startTime: event.endTime,
      endTime: "2026-12-10T12:00",
      resourceIds: ["equipment"],
    }),
  );
  assert.ok(saved.id);
});
test("resource reservations block another staff member and release after cancellation", async () => {
  const b = api();
  const a = await b.records.create(
    "o",
    appointment({ resourceIds: ["equipment"] }),
  );
  await assert.rejects(
    b.records.create(
      "o",
      appointment({ personId: "other", resourceIds: ["equipment"] }),
    ),
    /already reserved/,
  );
  await b.records.update("o", a.id, { status: "Cancelled" });
  assert.ok(
    await b.records.create(
      "o",
      appointment({ personId: "other", resourceIds: ["equipment"] }),
    ),
  );
});
test("approved leave on the second day of a job excludes a multi-day assignment", async () => {
  const b = api([
    {
      id: "leave",
      orgId: "o",
      module: "Leave and availability",
      personId: "person",
      startDate: "2026-12-12",
      endDate: "2026-12-12",
      approval: "Approved",
    },
  ]);
  await assert.rejects(
    b.records.create(
      "o",
      appointment({
        startTime: "2026-12-11T23:00",
        endTime: "2026-12-12T01:00",
      }),
    ),
    /Approved leave/,
  );
});
test("foreign customer/staff/resource IDs cannot be selected through direct demo writes", async () => {
  const b = api();
  await assert.rejects(
    b.records.create("o", appointment({ customerId: "foreign" })),
    /existing CRM customer/,
  );
  await assert.rejects(
    b.records.create("o", appointment({ personId: "foreign" })),
    /staff/i,
  );
  await assert.rejects(
    b.records.create("o", appointment({ resourceIds: ["foreign"] })),
    /existing asset/,
  );
});
test("completed appointments require outcomes and create one linked follow-up", async () => {
  const b = api();
  const a = await b.records.create("o", appointment());
  await assert.rejects(
    b.records.update("o", a.id, { status: "Complete" }),
    /outcome/,
  );
  await b.records.update("o", a.id, {
    status: "Complete",
    outcome: "Demo consultation completed",
  });
  const task = {
    module: "Tasks & projects",
    title: "Follow up",
    customerId: "customer",
    followUpForId: a.id,
    status: "Planned",
  };
  await b.records.create("o", task);
  await assert.rejects(b.records.create("o", task), /already has a follow-up/);
  await assert.rejects(
    b.records.update("o", a.id, { status: "Confirmed" }),
    /retained as history/,
  );
});
test("booking invoices preserve a single source link and can be settled after cancellation", async () => {
  const b = api([booking]);
  const invoice = {
    module: "Quotes and invoices",
    recordType: "invoice",
    title: "Demo invoice",
    customerId: "customer",
    bookingId: "booking",
    status: "Planned",
  };
  const saved = await b.records.create("o", invoice);
  await assert.rejects(
    b.records.create("o", invoice),
    /already has an invoice/,
  );
  await b.records.update("o", "booking", {
    bookingStatus: "Cancelled",
    status: "Cancelled",
  });
  await b.records.update("o", saved.id, {
    internalNotes: "Cancellation retained; credit reviewed separately",
  });
});
test("event reports calculate reservations/admissions/value using event dates and ignore registered rooms", () => {
  const records = fixture([
    booking,
    { ...booking, id: "cancelled", bookingStatus: "Cancelled", guests: 100 },
  ]).records;
  const config = {
    source: "Events & bookings",
    metric: "places",
    from: "2026-12-10",
    to: "2026-12-10",
    group: "status",
    calculation: "total",
  };
  const report = buildReport(records, "o", config);
  assert.equal(report.total, 3);
  assert.match(
    reportCsv(report, { ...config, fields: ["date", "value"] }, records),
    /2026-12-10/,
  );
  const value = buildReport(records, "o", {
    ...config,
    metric: "bookingValue",
  });
  assert.equal(value.total, 15);
});
test("calendar and validation reject impossible dates, backwards times and fractional capacity", () => {
  assert.equal(validDateTime("2026-02-30T12:00"), false);
  assert.equal(calendarDays("2026-12-10", "Week").length, 7);
  assert.equal(calendarDays("2026-02-10", "Month").length, 28);
  assert.throws(
    () =>
      validateScheduledRecord(
        { ...event, endTime: event.startTime },
        null,
        fixture().records,
        org,
      ),
    /end must be after/,
  );
  assert.throws(
    () =>
      validateScheduledRecord(
        { ...event, capacity: 1.5 },
        null,
        fixture().records,
        org,
      ),
    /whole number/,
  );
});
test("qualification changes recalculate eligibility for specialist event assignments", async () => {
  const b = api([
    {
      id: "training",
      orgId: "o",
      module: "Training and qualifications",
      personId: "person",
      qualification: "Safety inspection",
      approval: "Approved",
      expiry: "2026-12-01",
    },
  ]);
  // Add a configured training module to this independent fixture so the renewal can be saved.
  await b.entitlements.replace("o", [
    ...org.modules,
    "Training and qualifications",
  ]);
  const value = {
    ...event,
    requiredQualification: "Safety inspection",
    startTime: "2026-12-20T09:00",
    endTime: "2026-12-20T10:00",
  };
  await assert.rejects(b.records.create("o", value), /Qualification expired/);
  await b.records.update("o", "training", { expiry: "2028-01-01" });
  assert.ok(await b.records.create("o", value));
});
test("financial contacts must belong to the selected customer", async () => {
  const b = api();
  await assert.rejects(
    b.records.create("o", {
      module: "Quotes and invoices",
      recordType: "quote",
      title: "Demo quote",
      customerId: "customer",
      contactId: "foreign-contact",
    }),
    /contact belonging/,
  );
  assert.ok(
    await b.records.create("o", {
      module: "Quotes and invoices",
      recordType: "quote",
      title: "Demo quote",
      customerId: "customer",
      contactId: "contact",
    }),
  );
});
test("local summer dates include leave after midnight but a midnight finish releases the next day", async () => {
  const b = api([
    {
      id: "summer-leave",
      orgId: "o",
      module: "Leave and availability",
      personId: "person",
      startDate: "2027-07-02",
      endDate: "2027-07-02",
      approval: "Approved",
    },
  ]);
  await assert.rejects(
    b.records.create(
      "o",
      appointment({
        startTime: "2027-07-01T23:00",
        endTime: "2027-07-02T00:30",
      }),
    ),
    /Approved leave/,
  );
  assert.ok(
    await b.records.create(
      "o",
      appointment({
        startTime: "2027-07-01T23:00",
        endTime: "2027-07-02T00:00",
      }),
    ),
  );
});
test("booking report filters and exports follow changes to the event venue and staff", async () => {
  const b = api([booking]);
  await b.records.update("o", "event", { location: "Main hall" });
  const config = {
    source: "Events & bookings",
    metric: "places",
    group: "location",
    calculation: "total",
    location: "Main hall",
    staff: "person",
  };
  let rows = b.getSnapshot().records;
  let result = buildReport(rows, "o", config);
  assert.equal(result.total, 3);
  assert.equal(result.groups[0].label, "Main hall");
  let csv = reportCsv(
    result,
    { ...config, fields: ["location", "staff", "value"] },
    rows,
  );
  assert.match(csv, /Main hall/);
  assert.match(csv, /Sample Person/);
  await b.records.update("o", "event", {
    location: "Workshop",
    staffIds: ["other"],
  });
  rows = b.getSnapshot().records;
  assert.equal(buildReport(rows, "o", config).total, 0);
  result = buildReport(rows, "o", {
    ...config,
    location: "Workshop",
    staff: "other",
  });
  assert.equal(result.total, 3);
  csv = reportCsv(
    result,
    { ...config, fields: ["location", "staff", "value"] },
    rows,
  );
  assert.match(csv, /Workshop/);
  assert.match(csv, /Sample Other/);
});
test("a preparation task reports its own deadline rather than inheriting the event date", () => {
  const task = {
    module: "Tasks & projects",
    recordType: "task",
    orgId: "o",
    eventId: "event",
    dueDate: "2026-12-09",
  };
  assert.equal(reportDate(task, fixture().records), "2026-12-09");
});
