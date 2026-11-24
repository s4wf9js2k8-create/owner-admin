import test from "node:test";
import assert from "node:assert/strict";
import { createFictionalBackend } from "../src/backend/fictional.js";
import {
  remainingCapacity,
  platformAnnouncementRelevant,
  validateOriginalRecord,
} from "../src/reconciliation/rules.js";
import { validateScheduledRecord } from "../src/scheduling/rules.js";
import { generateNotifications } from "../src/notificationRules.js";
import { availabilityAssessment } from "../src/staffEligibility.js";
const org = {
  id: "o",
  modules: [
    "Staff & volunteers",
    "Training and qualifications",
    "Leave and availability",
    "Tasks & projects",
    "Bookings and appointments",
    "Quotes and invoices",
    "Customers / CRM",
    "Events & bookings",
    "Vehicle / fleet management",
    "Assets & equipment",
  ],
};
const person = {
  id: "p",
  orgId: "o",
  module: "Staff & volunteers",
  title: "Sample person",
  employmentStatus: "Active",
  team: "Operations",
};
const room = {
  id: "room",
  orgId: "o",
  module: "Bookings and appointments",
  recordType: "resource",
  title: "Sample room",
  bookingMode: "Shared capacity",
  capacity: 4,
  status: "Active",
};
const booking = (id, start = "09:00", end = "10:00", guests = 2) => ({
  id,
  orgId: "o",
  module: "Bookings and appointments",
  recordType: "resource-booking",
  title: id,
  bookingType: "Activity",
  startTime: "2026-12-01T" + start,
  endTime: "2026-12-01T" + end,
  guests,
  unitPrice: 10,
  customerId: "crm",
  resourceIds: ["room"],
  status: "Confirmed",
});
const api = (rows = []) =>
  createFictionalBackend({
    fixtures: () => ({
      orgs: [org],
      records: [
        person,
        room,
        {
          id: "crm",
          orgId: "o",
          module: "Customers / CRM",
          title: "Sample customer",
        },
        ...rows,
      ],
      flags: {},
      tickets: [],
      plans: [],
      logs: [],
    }),
  });
test("resource capacity measures concurrent peak, keeps boundary slots free, and rejects overbooking atomically", async () => {
  const a = booking("a", "09:00", "10:00", 2),
    b = booking("b", "10:00", "11:00", 2),
    candidate = booking("c", "09:00", "11:00", 2),
    backend = api([a, b]);
  assert.equal(remainingCapacity(room, [a, b], candidate), 2);
  await backend.records.create("o", candidate);
  const snapshot = backend.getSnapshot();
  await assert.rejects(
    backend.records.create("o", booking("too-many", "09:00", "11:00", 1)),
    /capacity/i,
  );
  assert.deepEqual(backend.getSnapshot(), snapshot);
  await assert.rejects(
    backend.records.update("o", "room", { capacity: 3 }),
    /capacity/i,
  );
});
test("event/appointment allocations conflict with service reservations in both directions", async () => {
  const reservation = booking("b");
  const event = {
    id: "event",
    orgId: "o",
    module: "Events & bookings",
    recordType: "event",
    title: "Sample event",
    schedulingVersion: 1,
    capacity: 10,
    status: "Planned",
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    resourceIds: ["room"],
    staffIds: [],
  };
  assert.throws(
    () =>
      validateScheduledRecord(event, null, [person, room, reservation], org),
    /already reserved/,
  );
  const backend = api([event]);
  await assert.rejects(backend.records.create("o", reservation), /conflicts/);
});
test("priced service reservation invoices once and cancellation preserves the invoice/customer history", async () => {
  const backend = api([booking("b")]);
  await backend.records.update("o", "b", {
    _workflow: { kind: "invoiceResourceBooking" },
  });
  await backend.records.update("o", "b", {
    _workflow: { kind: "invoiceResourceBooking" },
  });
  let invoice = backend
    .getSnapshot()
    .records.find((r) => r.resourceBookingId === "b");
  assert.equal(invoice.totals.total, 2000);
  assert.equal(invoice.customerId, "crm");
  assert.equal(
    backend.getSnapshot().records.filter((r) => r.resourceBookingId === "b")
      .length,
    1,
  );
  await backend.records.update("o", invoice.id, { documentStatus: "Issued" });
  await backend.records.update("o", "b", {
    _workflow: { kind: "cancelResourceBooking" },
  });
  await backend.records.update("o", "b", {
    _workflow: { kind: "cancelResourceBooking" },
  });
  invoice = backend.getSnapshot().records.find((r) => r.id === invoice.id);
  assert.equal(invoice.credits[0].amountPence, 2000);
  assert.equal(invoice.credits.length, 1);
  assert.equal(
    backend.getSnapshot().records.find((r) => r.id === "b").status,
    "Cancelled",
  );
});
test("subtasks reject hierarchy cycles and completion before children, and inherit project changes", async () => {
  const task = {
      id: "parent",
      orgId: "o",
      module: "Tasks & projects",
      recordType: "task",
      title: "Parent",
      status: "Planned",
      projectId: "project",
    },
    project = {
      id: "project",
      orgId: "o",
      module: "Tasks & projects",
      recordType: "project",
      title: "Project",
      budget: 100,
    };
  const backend = api([task, project]);
  const child = await backend.records.create("o", {
    ...task,
    parentTaskId: "parent",
    title: "Child",
  });
  await assert.rejects(
    backend.records.update("o", "parent", { parentTaskId: child.id }),
    /cycle/,
  );
  await assert.rejects(
    backend.records.update("o", "parent", { status: "Complete" }),
    /subtasks/,
  );
  await backend.records.update("o", "parent", { projectId: "" });
  assert.equal(
    backend.getSnapshot().records.find((r) => r.id === child.id).projectId,
    "",
  );
  await backend.records.update("o", child.id, { status: "Complete" });
  await backend.records.update("o", "parent", { status: "Complete" });
});
test("renaming staff refreshes foreign-key labels while reset preserves the exact original fixtures", async () => {
  const backend = api([
    {
      id: "t",
      orgId: "o",
      module: "Tasks & projects",
      title: "Assigned",
      ownerId: "p",
      owner: "Sample person",
      personId: "p",
      person: "Sample person",
    },
  ]);
  const initial = structuredClone(backend.getSnapshot());
  await backend.records.update("o", "p", { title: "Updated sample person" });
  const task = backend.getSnapshot().records.find((r) => r.id === "t");
  assert.equal(task.owner, "Updated sample person");
  assert.equal(task.person, "Updated sample person");
  assert.equal(task.ownerId, "p");
  await backend.reset();
  assert.deepEqual(backend.getSnapshot(), initial);
});
test("cancelled unavailability no longer prevents an assignment", () => {
  const unavailable = {
    id: "u",
    orgId: "o",
    module: "Leave and availability",
    personId: "p",
    requestType: "Unavailable",
    startDate: "2026-12-01",
    endDate: "2026-12-01",
    approval: "Cancelled",
  };
  assert.equal(
    availabilityAssessment(person, [person, unavailable], "o", {
      kind: "schedule",
      date: "2026-12-01",
    }).eligible,
    true,
  );
  unavailable.approval = "Pending";
  assert.equal(
    availabilityAssessment(person, [person, unavailable], "o", {
      kind: "schedule",
      date: "2026-12-01",
    }).eligible,
    false,
  );
});
test("vehicle-specific competency is enforced by the same daily-check command", async () => {
  const vehicle = {
      id: "v",
      orgId: "o",
      module: "Vehicle / fleet management",
      recordType: "vehicle",
      title: "Specialist van",
      mileage: 0,
      requiredQualification: "Specialist driving",
      checkQuestions: ["Tyres"],
    },
    backend = api([vehicle]);
  await assert.rejects(
    backend.records.update("o", "v", {
      _workflow: {
        kind: "vehicleCheck",
        driverId: "p",
        requestId: "check",
        date: "2026-12-01",
        mileage: 1,
        answers: { Tyres: "Pass" },
      },
    }),
    /specialist driving/i,
  );
});
test("event staffing alerts recompute qualifications and publication is independent of enabled modules", () => {
  const event = {
    id: "e",
    orgId: "o",
    module: "Events & bookings",
    recordType: "event",
    title: "Public session",
    startTime: "2026-12-01T09:00",
    endTime: "2026-12-01T10:00",
    minimumStaff: 1,
    staffIds: ["p"],
    requiredQualification: "Event steward",
    status: "Planned",
  };
  const q = {
    id: "q",
    orgId: "o",
    module: "Training and qualifications",
    personId: "p",
    qualification: "Event steward",
    approval: "Approved",
    noExpiry: true,
  };
  const alerts = (rows) =>
    generateNotifications(rows, "o", {
      now: new Date("2026-11-25T12:00Z"),
    }).filter((n) => n.kind === "staffing");
  assert.equal(alerts([person, event]).length, 1);
  assert.equal(alerts([person, event, q]).length, 0);
  const notice = {
    status: "Published (demo)",
    audience: "Selected companies",
    companyIds: ["o"],
  };
  assert.equal(
    platformAnnouncementRelevant(notice, { id: "o", modules: [] }),
    true,
  );
  assert.equal(
    platformAnnouncementRelevant({ ...notice, status: "Archived" }, org),
    false,
  );
});

test("unsaved booking form does not match invoices without a booking reference", () => {
  const draft = { ...booking(undefined), title: "Unsaved booking", orgId: "o" };
  assert.doesNotThrow(() =>
    validateOriginalRecord(
      draft,
      null,
      [
        room,
        { id: "crm", orgId: "o", module: "Customers / CRM", title: "Customer" },
        {
          id: "unrelated",
          orgId: "o",
          module: "Quotes and invoices",
          recordType: "invoice",
        },
      ],
      org,
    ),
  );
});
test("approved positive availability gates assignments without reducing leave, and stale dates cannot be approved", async () => {
  const { approvalToken } = await import("../src/administrationRules.js"),
    { leaveBalances } = await import("../src/completion/metrics.js");
  const range = {
      id: "available",
      orgId: "o",
      module: "Leave and availability",
      title: "Available dates",
      personId: "p",
      requestType: "Available",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
      approval: "Pending",
    },
    reviewer = {
      id: "reviewer",
      orgId: "o",
      module: "Staff & volunteers",
      title: "Reviewer",
      employmentStatus: "Active",
    };
  const backend = api([range, reviewer]);
  await backend.records.update("o", "p", {
    availabilityMode: "Recorded dates only",
  });
  const eligible = (date) => {
    const all = backend.getSnapshot().records;
    return availabilityAssessment(
      all.find((p) => p.id === "p"),
      all,
      "o",
      { kind: "schedule", date },
    ).eligible;
  };
  assert.equal(eligible("2026-12-01"), false);
  const token = approvalToken(
    backend.getSnapshot().records.find((r) => r.id === "available"),
  );
  await backend.records.update("o", "available", { endDate: "2026-12-02" });
  await assert.rejects(
    backend.records.update("o", "available", {
      _approval: {
        token,
        actorId: "reviewer",
        decision: "Approve",
        comment: "Outdated request",
      },
    }),
    /stale/,
  );
  await backend.records.update("o", "available", {
    _approval: {
      token: approvalToken(
        backend.getSnapshot().records.find((r) => r.id === "available"),
      ),
      actorId: "reviewer",
      decision: "Approve",
      comment: "Confirmed available dates",
    },
  });
  assert.equal(eligible("2026-12-01"), true);
  assert.equal(eligible("2026-12-03"), false);
  assert.equal(
    leaveBalances(backend.getSnapshot().records, [person], "2026")[0].used,
    0,
  );
});
test("project team assignments reject inactive new members and preserve unavailable historical members until explicitly removed", async () => {
  const project = {
      id: "project",
      orgId: "o",
      module: "Tasks & projects",
      recordType: "project",
      title: "Project",
      budget: 100,
      memberIds: [],
      dueDate: "2026-12-01",
    },
    left = {
      id: "left",
      orgId: "o",
      module: "Staff & volunteers",
      title: "Former employee",
      employmentStatus: "Left",
    };
  const backend = api([project, left]);
  await assert.rejects(
    backend.records.update("o", "project", { memberIds: ["left"] }),
    /Inactive/,
  );
  const historical = api([{ ...project, memberIds: ["left"] }, left]);
  await historical.records.update("o", "project", { budget: 120 });
  assert.deepEqual(
    historical.getSnapshot().records.find((r) => r.id === "project").memberIds,
    ["left"],
  );
  await assert.rejects(
    historical.records.update("o", "project", { dueDate: "2026-12-02" }),
    /Inactive/,
  );
  await historical.records.update("o", "project", { memberIds: [] });
});
