import { moduleInfo } from "../customerModules.js";
import { availabilityAssessment } from "../staffEligibility.js";
import {
  validateInterval,
  overlaps,
  resourcesFor,
  scheduledActive,
  resourceRecords,
} from "../scheduling/rules.js";
import {
  financialTotals,
  nextFinancialReference,
  totalPence,
  financialStatus,
} from "../financialRules.js";
const type = (r) => moduleInfo(r.module).type;
const calendarDate = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || "") &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v + "T12:00Z").toISOString().slice(0, 10) === v;
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
export const serviceBooking = (r) => r.recordType === "resource-booking";
export const activeBooking = (r) =>
  serviceBooking(r) && ["Pending", "Confirmed"].includes(r.status);
export function remainingCapacity(resource, records, candidate) {
  const capacity =
    resource.bookingMode === "Shared capacity"
      ? Number(resource.capacity || 1)
      : 1;
  const bookings = records.filter(
    (r) =>
      r.orgId === candidate.orgId &&
      r.id !== candidate.id &&
      activeBooking(r) &&
      resourcesFor(r).includes(resource.id) &&
      overlaps(r, candidate),
  );
  const points = [
    candidate.startTime,
    ...bookings
      .map((r) => r.startTime)
      .filter((t) => t > candidate.startTime && t < candidate.endTime),
  ];
  const peak = Math.max(
    0,
    ...points.map((t) =>
      bookings
        .filter((r) => r.startTime <= t && r.endTime > t)
        .reduce(
          (n, r) =>
            n +
            (resource.bookingMode === "Shared capacity" ? Number(r.guests) : 1),
          0,
        ),
    ),
  );
  return Math.max(0, capacity - peak);
}
export function validateOriginalRecord(r, old, records, org) {
  const same = records.filter((x) => x.orgId === r.orgId),
    tasks = same.filter(
      (x) => type(x) === "projects" && x.recordType !== "project",
    );
  if (["people", "projects"].includes(type(r)))
    assert(r.title?.trim(), "Provide a record name.");
  if (r.requestType === "Available") {
    assert(
      calendarDate(r.startDate) &&
        calendarDate(r.endDate) &&
        r.startDate <= r.endDate,
      "Choose an available start date and a later or matching end date.",
    );
    assert(
      same.some((p) => p.id === r.personId && type(p) === "people"),
      "Select an existing employee.",
    );
  }
  if (type(r) === "projects") {
    if (r.recordType === "project")
      for (const id of r.memberIds || []) {
        if (!old || !old.memberIds?.includes(id) || old.dueDate !== r.dueDate) {
          const p = same.find((p) => p.id === id && type(p) === "people");
          assert(p, "Select an existing project team member.");
          const a = availabilityAssessment(p, same, r.orgId, {
            kind: "projects",
            date: r.dueDate,
            excludedRecordId: r.id,
          });
          assert(a.eligible, p.title + ": " + a.reasons.join("; "));
        }
      }
    if (
      !old &&
      r.originId &&
      tasks.some((t) => t.id === r.originId && t.title === r.title)
    )
      assert(
        !tasks.some(
          (t) =>
            t.originId === r.originId &&
            t.title === r.title &&
            t.dueDate === r.dueDate,
        ),
        "The next task occurrence already exists.",
      );
    if (r.parentTaskId) {
      assert(r.recordType !== "project", "A project cannot be a subtask.");
      const seen = new Set([r.id]);
      let id = r.parentTaskId;
      while (id) {
        assert(!seen.has(id), "Subtask hierarchy cannot contain a cycle.");
        seen.add(id);
        const parent = tasks.find((t) => t.id === id);
        assert(parent, "Choose an existing parent task.");
        id = parent.parentTaskId;
      }
      const parent = tasks.find((t) => t.id === r.parentTaskId);
      assert(
        !["Complete", "Cancelled"].includes(parent.status) ||
          r.status === "Complete",
        "Reopen the parent task before adding unfinished work.",
      );
    }
    if (r.status === "Complete")
      assert(
        !tasks.some((t) => t.parentTaskId === r.id && t.status !== "Complete"),
        "Complete the subtasks before finishing this task.",
      );
  }
  if (type(r) === "events" && r.minimumStaff !== undefined)
    assert(
      Number.isSafeInteger(Number(r.minimumStaff)) &&
        Number(r.minimumStaff) >= 0,
      "Minimum event staffing must be a non-negative whole number.",
    );
  if (r.recordType === "resource") {
    assert(r.title?.trim(), "Provide a resource name.");
    if (r.capacity !== undefined)
      assert(
        Number.isSafeInteger(Number(r.capacity)) && Number(r.capacity) > 0,
        "Resource capacity must be a positive whole number.",
      );
    for (const b of same.filter(
      (x) => activeBooking(x) && resourcesFor(x).includes(r.id),
    )) {
      assert(
        Number(b.guests) <= Number(r.capacity || 1),
        "Capacity cannot be reduced below existing reservation places.",
      );
      const available = remainingCapacity(r, same, b);
      assert(
        available >=
          (r.bookingMode === "Shared capacity" ? Number(b.guests) : 1),
        "Capacity cannot be reduced below existing reservations.",
      );
    }
  }
  if (type(r) === "finance" && r.resourceBookingId) {
    const b = same.find(
      (b) => b.id === r.resourceBookingId && serviceBooking(b),
    );
    assert(
      b && b.customerId === r.customerId,
      "The booking invoice must retain its linked customer.",
    );
    assert(
      !same.some(
        (x) =>
          x.id !== r.id &&
          x.resourceBookingId === r.resourceBookingId &&
          x.recordType === "invoice",
      ),
      "The resource booking already has an invoice.",
    );
  }
  if (!serviceBooking(r)) return;
  assert(type(r) === "bookings" && r.title?.trim(), "Provide a booking title.");
  validateInterval(r.startTime, r.endTime);
  assert(
    ["Pending", "Confirmed", "Complete", "Cancelled"].includes(r.status),
    "Choose a valid booking status.",
  );
  assert(
    same.some((c) => c.id === r.customerId && type(c) === "crm"),
    "Select an existing CRM customer.",
  );
  assert(
    Number.isSafeInteger(Number(r.guests)) && Number(r.guests) > 0,
    "Places or units must be a positive whole number.",
  );
  assert(
    /^\d+(\.\d{1,2})?$/.test(String(r.unitPrice)) &&
      Number.isFinite(Number(r.unitPrice)),
    "Enter a non-negative price with up to two decimal places.",
  );
  assert(
    r.bookingType?.trim() && r.resourceIds?.length,
    "Select a booking type and an existing resource.",
  );
  if (old && ["Complete", "Cancelled"].includes(old.status))
    assert(
      JSON.stringify(r) === JSON.stringify(old) || r.status === old.status,
      "Duplicate completed or cancelled bookings instead of reopening history.",
    );
  if (!activeBooking(r)) return;
  if (r.personId) {
    const p = same.find((x) => x.id === r.personId && type(x) === "people");
    assert(p, "Select an existing employee.");
    const a = availabilityAssessment(p, same, r.orgId, {
      kind: "bookings",
      date: r.startTime,
      startTime: r.startTime,
      endTime: r.endTime,
      excludedRecordId: r.id,
      requiredQualification: r.requiredQualification,
      department: r.requiredDepartment,
    });
    assert(a.eligible, a.reasons.join("; "));
  }
  for (const id of r.resourceIds) {
    const resource = resourceRecords(same).find((x) => x.id === id);
    assert(resource, "Select an existing resource.");
    assert(
      !["Out of service", "Needs attention"].includes(resource.condition),
      "This resource is unavailable.",
    );
    assert(
      !same.some(
        (x) =>
          x.id !== r.id &&
          scheduledActive(x) &&
          !serviceBooking(x) &&
          x.recordType !== "resource" &&
          resourcesFor(x).includes(id) &&
          overlaps(x, r),
      ),
      "This resource conflicts with an event or appointment.",
    );
    assert(
      Number(r.guests) <= Number(resource.capacity || 1),
      "Places or units exceed this resource capacity.",
    );
    assert(
      remainingCapacity(resource, same, r) >=
        (resource.bookingMode === "Shared capacity" ? Number(r.guests) : 1),
      "Booking exceeds the resource capacity for these times.",
    );
  }
  if (
    !old ||
    ["startTime", "endTime", "guests", "unitPrice", "customerId"].some(
      (k) => JSON.stringify(old[k]) !== JSON.stringify(r[k]),
    )
  )
    assert(
      !r.id ||
        !same.some(
          (x) => x.resourceBookingId === r.id && x.recordType === "invoice",
        ),
      "Correct the linked invoice before changing priced booking details.",
    );
  void org;
}
export function deriveRecordLinks(records, previous = []) {
  const prior = new Map(previous.map((r) => [r.id, r]));
  const renamed = new Set(
    records
      .filter((r) => type(r) === "people" && prior.get(r.id)?.title !== r.title)
      .map((r) => r.id),
  );
  const people = new Map(
    records.filter((r) => type(r) === "people").map((p) => [p.id, p]),
  );
  const rows = records.map((r) => {
    const out = { ...r };
    for (const [id, label] of [
      ["personId", "person"],
      ["ownerId", "owner"],
      ["engineerId", "owner"],
      ["inspectorId", "inspector"],
      ["driverId", "driver"],
      ["custodianId", "custodian"],
      ["leadId", "owner"],
    ]) {
      const p = people.get(r[id]);
      if (
        p &&
        p.orgId === r.orgId &&
        (!prior.has(r.id) || prior.get(r.id)[id] !== r[id] || renamed.has(p.id))
      )
        out[label] = p.title;
    }
    return out;
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const r of rows)
    if (r.parentTaskId) {
      let parent = byId.get(r.parentTaskId);
      const seen = new Set([r.id]);
      while (parent?.parentTaskId && !seen.has(parent.id)) {
        seen.add(parent.id);
        parent = byId.get(parent.parentTaskId);
      }
      if (parent?.orgId === r.orgId) r.projectId = parent.projectId || "";
    }
  return rows;
}
export function originalCommand(records, org, id, c, actor = {}) {
  if (!["invoiceResourceBooking", "cancelResourceBooking"].includes(c.kind))
    return null;
  const rows = structuredClone(records),
    b = rows.find((r) => r.id === id && r.orgId === org.id);
  assert(
    b && serviceBooking(b),
    "Choose an existing service/resource booking.",
  );
  const at = new Date().toISOString(),
    note = (r, text) => {
      r.activity = [
        ...(r.activity || []),
        {
          id: crypto.randomUUID(),
          at,
          actorId: actor.actorId || "",
          actorName: actor.actorName || "Fictional operator",
          action: c.kind,
          details: text,
        },
      ];
    };
  if (c.kind === "invoiceResourceBooking") {
    assert(
      ["Confirmed", "Complete"].includes(b.status),
      "Confirm the booking before invoicing.",
    );
    if (
      rows.some((r) => r.resourceBookingId === id && r.recordType === "invoice")
    )
      return records;
    const module = org.modules.find((m) => type({ module: m }) === "finance");
    assert(module, "Enable Quotes and invoices first.");
    const lineItems = [
        {
          description: b.title,
          quantity: Number(b.guests),
          rate: Number(b.unitPrice),
          discount: 0,
          vat: 0,
        },
      ],
      totals = financialTotals(lineItems);
    assert(totals.total > 0, "A free booking does not need an invoice.");
    const reference = nextFinancialReference(rows, "invoice"),
      invoice = {
        id: crypto.randomUUID(),
        orgId: org.id,
        module,
        recordType: "invoice",
        createdById: actor.actorId || "",
        resourceBookingId: id,
        customerId: b.customerId,
        reference,
        title: reference,
        lineItems,
        totals,
        amount: totals.total / 100,
        creationDate: at.slice(0, 10),
        dueDate: new Date(Date.parse(at) + 30 * 86400000)
          .toISOString()
          .slice(0, 10),
        documentStatus: "Draft",
        payments: [],
        credits: [],
        createdAt: at,
      };
    rows.push(invoice);
    b.invoiceId = invoice.id;
    note(b, "Created linked draft invoice " + reference);
    note(invoice, "Created from resource booking " + b.title);
  } else {
    if (b.status === "Cancelled") return records;
    b.status = "Cancelled";
    b.cancelledAt = at;
    const inv = rows.find(
      (r) => r.id === b.invoiceId && r.resourceBookingId === id,
    );
    if (inv) {
      if (financialStatus(inv) === "Draft") inv.documentStatus = "Cancelled";
      else if (financialStatus(inv) !== "Cancelled") {
        const credit =
          totalPence(inv) -
          (inv.credits || []).reduce((n, x) => n + x.amountPence, 0);
        if (credit > 0)
          inv.credits = [
            ...(inv.credits || []),
            {
              id: crypto.randomUUID(),
              amountPence: credit,
              date: at.slice(0, 10),
              reference: "Cancelled booking " + b.title,
              at,
            },
          ];
      }
      note(
        inv,
        "Booking cancelled; explicit fictional refund remains required if paid.",
      );
    }
    note(b, "Cancelled; resource capacity restored.");
  }
  return rows;
}
export const platformAnnouncementRelevant = (a, org) =>
  a.status === "Published (demo)" &&
  (a.audience === "All companies" ||
    (a.audience === "Selected companies" && a.companyIds?.includes(org.id)) ||
    (a.audience === "Pilot customers" && org.plan === "Pilot") ||
    (a.audience === "Professional customers" && org.plan === "Professional") ||
    (a.audience === "Enterprise customers" && org.plan === "Enterprise"));
export function eventStaffing(event, records) {
  const ids = [...new Set(event.staffIds || [])],
    eligible = ids.filter((id) => {
      const p = records.find(
        (p) => p.id === id && p.orgId === event.orgId && type(p) === "people",
      );
      return (
        p &&
        availabilityAssessment(p, records, event.orgId, {
          kind: "events",
          date: event.startTime,
          startTime: event.startTime,
          endTime: event.endTime,
          excludedRecordId: event.id,
          requiredQualification: event.requiredQualification,
          department: event.requiredDepartment,
        }).eligible
      );
    });
  return {
    required: Number(event.minimumStaff || 0),
    eligible: eligible.length,
    shortfall: Math.max(0, Number(event.minimumStaff || 0) - eligible.length),
  };
}
