import { moduleInfo } from "../customerModules.js";
import { availabilityAssessment } from "../staffEligibility.js";
import { validateDemoAssignment } from "../demoAssignmentRules.js";
import {
  financialTotals,
  totalPence,
  documentKind,
  financialStatus,
} from "../financialRules.js";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const kind = (r) => moduleInfo(r.module).type;
export function qualifiedCoverage(
  records,
  orgId,
  shifts,
  date,
  requirement,
  operations = {},
) {
  const start = date + "T" + (requirement.start || operations.start || "09:00"),
    end = date + "T" + (requirement.end || operations.end || "17:00");
  const candidates = shifts
    .filter(
      (s) =>
        !["Cancelled", "Complete"].includes(s.status) &&
        s.startTime < end &&
        s.endTime > start &&
        (!requirement.location || s.location === requirement.location),
    )
    .filter((s) => {
      const p = records.find(
        (p) =>
          p.orgId === orgId &&
          (p.id === s.personId || (!s.personId && p.title === s.person)),
      );
      return (
        p &&
        availabilityAssessment(p, records, orgId, {
          kind: "schedule",
          date,
          startTime: s.startTime,
          endTime: s.endTime,
          excludedRecordId: s.id,
          requiredQualification: requirement.qualification,
        }).eligible
      );
    });
  const points = [
    ...new Set([
      start,
      end,
      ...candidates.flatMap((s) => [
        s.startTime > start ? s.startTime : start,
        s.endTime < end ? s.endTime : end,
      ]),
    ]),
  ].sort();
  return Math.min(
    ...points
      .slice(0, -1)
      .map(
        (t) =>
          new Set(
            candidates
              .filter((s) => s.startTime <= t && s.endTime > t)
              .map((s) => s.personId || s.person),
          ).size,
      ),
    1000000,
  );
}
export const paidPence = (r) =>
  (r.payments || []).reduce((n, p) => n + Number(p.amountPence), 0) -
  (r.refunds || []).reduce((n, p) => n + Number(p.amountPence), 0);
export const creditPence = (r) =>
  (r.credits || []).reduce((n, p) => n + Number(p.amountPence), 0);
export const refundDue = (r) =>
  Math.max(0, paidPence(r) - (totalPence(r) - creditPence(r)));
export function finalCommand(records, org, id, c, actor = {}) {
  if (
    ![
      "requestSwap",
      "decideSwap",
      "repeatInspection",
      "creditInvoice",
      "refundInvoice",
      "checkAttendee",
      "cancelReservation",
    ].includes(c.kind)
  )
    return null;
  const next = structuredClone(records),
    r = next.find((r) => r.orgId === org.id && r.id === id),
    now = new Date().toISOString();
  assert(r, "Record unavailable.");
  const find = (id, type) => {
    const row = next.find(
      (x) => x.orgId === org.id && x.id === id && (!type || kind(x) === type),
    );
    assert(row, "Select an existing " + (type || "business") + " record.");
    return row;
  };
  const note = (row, text) => {
    row.activity = [
      ...(row.activity || []),
      {
        id: crypto.randomUUID(),
        at: now,
        actorId: actor.actorId || "",
        actorName: actor.actorName || "Fictional operator",
        action: c.kind,
        details: text,
      },
    ];
  };
  if (c.kind === "requestSwap") {
    assert(
      kind(r) === "schedule" && r.startTime && r.endTime,
      "Choose a timed shift.",
    );
    const other = find(c.targetId, "schedule");
    assert(
      other.id !== id &&
        other.startTime &&
        other.endTime &&
        other.personId &&
        r.personId &&
        other.personId !== r.personId,
      "Choose another staff member’s timed shift.",
    );
    assert(
      r.swapRequest?.status !== "Pending",
      "This shift already has a pending swap.",
    );
    assert(c.reason?.trim(), "Explain the swap.");
    r.swapRequest = {
      id: crypto.randomUUID(),
      targetId: other.id,
      requesterId: actor.actorId || r.personId,
      status: "Pending",
      reason: c.reason,
      at: now,
      sourcePersonId: r.personId,
      targetPersonId: other.personId,
    };
    note(r, "Swap requested with " + other.title);
  } else if (c.kind === "decideSwap") {
    const request = r.swapRequest;
    assert(
      request?.status === "Pending",
      "This swap has already been decided.",
    );
    const other = find(request.targetId, "schedule"),
      reviewer = find(c.reviewerId, "people");
    assert(
      reviewer.employmentStatus === "Active",
      "Choose an active reviewer.",
    );
    assert(
      actor.actorId === reviewer.id,
      "Switch Working as to the reviewing staff profile.",
    );
    assert(
      org.workspaceConfig?.disallowSelfApproval === false ||
        ![r.personId, other.personId, request.requesterId].includes(
          reviewer.id,
        ),
      "Company rules prevent self-approval.",
    );
    assert(
      ["Approve", "Reject"].includes(c.decision) && c.comment?.trim(),
      "Choose a decision and give a reason.",
    );
    assert(
      r.personId === request.sourcePersonId &&
        other.personId === request.targetPersonId,
      "Assignments changed. Request a new swap.",
    );
    if (c.decision === "Approve") {
      const one = find(r.personId, "people"),
        two = find(other.personId, "people");
      for (const [row, p] of [
        [r, two],
        [other, one],
      ]) {
        row.personId = p.id;
        row.person = p.title;
        row.ownerId = p.id;
        row.owner = p.title;
        validateDemoAssignment(
          row,
          row,
          next.filter((x) => ![r.id, other.id].includes(x.id)),
          true,
        );
        note(row, "Swap approved by " + reviewer.title);
      }
    }
    r.swapRequest = {
      ...request,
      status: c.decision === "Approve" ? "Approved" : "Rejected",
      reviewerId: reviewer.id,
      comment: c.comment,
      decidedAt: now,
    };
    note(r, "Swap " + r.swapRequest.status);
  } else if (c.kind === "repeatInspection") {
    assert(
      kind(r) === "inspections" && r.inspectionQuestions?.length,
      "Choose a templated inspection.",
    );
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(c.from || "") && c.to >= c.from,
      "Choose a valid recurrence range.",
    );
    const interval = Number(c.interval);
    assert(
      Number.isInteger(interval) && interval > 0,
      "Choose a positive repeat interval.",
    );
    const count =
      Math.floor(
        (Date.parse(c.to) - Date.parse(c.from)) / 86400000 / interval,
      ) + 1;
    assert(count > 0 && count <= 60, "Generate at most 60 inspections.");
    for (let i = 0; i < count; i++) {
      const dueDate = new Date(Date.parse(c.from) + i * interval * 86400000)
        .toISOString()
        .slice(0, 10);
      if (next.some((x) => x.repeatSourceId === id && x.dueDate === dueDate))
        continue;
      const row = {
        ...r,
        id: crypto.randomUUID(),
        repeatSourceId: id,
        dueDate,
        status: "Planned",
        approval: "Pending",
        responses: {},
        result: "Pending",
        submittedAt: "",
        reviewedAt: "",
        createdAt: now,
        activity: [],
        history: [],
      };
      delete row.archivedAt;
      delete row.swapRequest;
      validateDemoAssignment(row, row, next, true);
      next.push(row);
      note(row, "Recurring inspection generated");
    }
    note(r, "Inspection recurrence generated");
  } else if (c.kind === "creditInvoice" || c.kind === "refundInvoice") {
    assert(
      kind(r) === "finance" &&
        documentKind(r) === "invoice" &&
        !["Draft", "Cancelled"].includes(financialStatus(r)),
      "Issue an invoice first.",
    );
    const amount = Math.round(Number(c.amount) * 100);
    assert(
      Number.isSafeInteger(amount) &&
        amount > 0 &&
        /^\d+(\.\d{1,2})?$/.test(String(c.amount)),
      "Enter a positive amount with at most two decimal places.",
    );
    assert(
      c.reference?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(c.date || ""),
      "Provide a reference/reason and date.",
    );
    assert(
      c.date <= now.slice(0, 10) &&
        (!r.creationDate || c.date >= r.creationDate) &&
        new Date(c.date).toISOString().slice(0, 10) === c.date,
      "Correction/refund date must be between invoice creation and today.",
    );
    const limit =
      c.kind === "creditInvoice"
        ? totalPence(r) - creditPence(r)
        : refundDue(r);
    assert(
      amount <= limit,
      "Amount exceeds the available " +
        (c.kind === "creditInvoice"
          ? "uncredited invoice value."
          : "credit balance available for refund."),
    );
    const field = c.kind === "creditInvoice" ? "credits" : "refunds";
    r[field] = [
      ...(r[field] || []),
      {
        id: crypto.randomUUID(),
        amountPence: amount,
        reference: c.reference,
        date: c.date,
        method: c.method || "Manual fictional record",
        at: now,
      },
    ];
    note(
      r,
      c.kind === "creditInvoice"
        ? "Credit note recorded"
        : "Fictional refund recorded; no money moved",
    );
  } else if (c.kind === "checkAttendee") {
    assert(
      r.recordType === "booking" &&
        ["Confirmed", "Checked in"].includes(r.bookingStatus),
      "Confirm this reservation before checking in.",
    );
    const attendee = r.attendees?.find((a) => a.id === c.attendeeId);
    assert(attendee, "Choose a recorded attendee.");
    if (c.undo) {
      assert(attendee.checkedInAt, "This attendee is not checked in.");
      attendee.checkedInAt = "";
    } else {
      assert(!attendee.checkedInAt, "This attendee has already checked in.");
      attendee.checkedInAt = now;
    }
    r.bookingStatus = r.attendees.every((a) => a.checkedInAt)
      ? "Checked in"
      : "Confirmed";
    note(r, "Attendee checked in: " + attendee.name);
  } else if (c.kind === "cancelReservation") {
    assert(r.recordType === "booking", "Choose a reservation.");
    if (r.bookingStatus === "Cancelled") return records;
    r.bookingStatus = "Cancelled";
    r.status = "Cancelled";
    r.cancelledAt = now;
    const invoice = next.find(
      (x) => x.orgId === org.id && x.id === r.invoiceId,
    );
    if (invoice && documentKind(invoice) === "invoice") {
      if (financialStatus(invoice) === "Draft") {
        invoice.documentStatus = "Cancelled";
        invoice.paymentStatus = "Cancelled";
      } else {
        const amount = totalPence(invoice) - creditPence(invoice);
        if (amount > 0)
          invoice.credits = [
            ...(invoice.credits || []),
            {
              id: crypto.randomUUID(),
              amountPence: amount,
              date: now.slice(0, 10),
              reference: "Cancellation: " + r.title,
              at: now,
              sourceBookingId: id,
            },
          ];
      }
      note(
        invoice,
        "Booking cancelled; financial correction recorded. Refunds require an explicit fictional refund entry.",
      );
    }
    note(r, "Reservation cancelled; capacity released");
  }
  return next;
}
export function validateFinalRecord(r, old, records) {
  const type = kind(r),
    within = (id, type) =>
      records.some(
        (x) =>
          x.orgId === r.orgId && x.id === id && (!type || kind(x) === type),
      );
  if (r.recordType === "product") {
    assert(
      r.title?.trim() && r.code?.trim(),
      "Product/service name and code are required.",
    );
    financialTotals([
      { description: r.title, quantity: 1, rate: r.rate, vat: r.vat || 0 },
    ]);
    assert(
      !records.some(
        (x) =>
          x.orgId === r.orgId &&
          x.id !== r.id &&
          x.recordType === "product" &&
          x.code.toLowerCase() === r.code.toLowerCase(),
      ),
      "Product/service code already exists.",
    );
  }
  if (type === "timesheets" && (r.startTime || r.endTime)) {
    assert(
      !r.personId || within(r.personId, "people"),
      "Select an existing staff member.",
    );
    assert(
      r.startTime && !Number.isNaN(Date.parse(r.startTime)),
      "Set a valid clock-in.",
    );
    if (r.endTime)
      assert(
        Number.isFinite(Date.parse(r.endTime)) && r.endTime >= r.startTime,
        "Clock-out cannot precede clock-in.",
      );
    const duration = r.endTime
      ? (Date.parse(r.endTime) - Date.parse(r.startTime)) / 60000
      : Infinity;
    assert(
      Number.isFinite(Number(r.breakMinutes || 0)) &&
        Number(r.breakMinutes || 0) >= 0 &&
        Number(r.breakMinutes || 0) <= duration,
      "Breaks must fit within the session.",
    );
    assert(
      !r.projectId || within(r.projectId, "projects"),
      "Select an existing project.",
    );
    assert(
      !r.jobId || within(r.jobId, "maintenance"),
      "Select an existing maintenance job.",
    );
    const personKey = (x) =>
      x.personId ||
      records.find(
        (p) =>
          p.orgId === x.orgId && kind(p) === "people" && p.title === x.person,
      )?.id ||
      x.person;
    const person = personKey(r);
    assert(
      !records.some(
        (x) =>
          x.orgId === r.orgId &&
          x.id !== r.id &&
          kind(x) === "timesheets" &&
          personKey(x) === person &&
          x.startTime &&
          r.startTime < (x.endTime || "9999") &&
          (r.endTime || "9999") > x.startTime,
      ),
      "This attendance session overlaps another recorded session.",
    );
  }
  if (type === "archives" && r.recordType === "collection-item") {
    assert(
      r.title?.trim() &&
        r.reference?.trim() &&
        r.category?.trim() &&
        r.location?.trim() &&
        r.detail?.trim(),
      "Complete the collection title, reference, category, location and description.",
    );
    assert(
      !records.some(
        (x) =>
          x.orgId === r.orgId &&
          x.id !== r.id &&
          kind(x) === "archives" &&
          x.reference?.trim().toLowerCase() ===
            r.reference.trim().toLowerCase(),
      ),
      "That collection reference is already used.",
    );
    assert(
      !r.digitalReference || /^https?:\/\//i.test(r.digitalReference),
      "Digital references must use http or https.",
    );
  }
  if (r.recordType === "booking" && r.attendees?.length) {
    assert(
      r.attendees.length === Number(r.guests),
      "Record one attendee name per reserved place.",
    );
    assert(
      new Set(r.attendees.map((a) => a.id)).size === r.attendees.length &&
        r.attendees.every((a) => a.id && a.name?.trim()),
      "Attendee identities must be unique and named.",
    );
  }
  if (
    type === "events" &&
    r.recordType !== "booking" &&
    r.ticketCategories?.length
  ) {
    assert(
      new Set(r.ticketCategories.map((t) => t.id)).size ===
        r.ticketCategories.length,
      "Ticket categories need unique IDs.",
    );
    for (const t of r.ticketCategories)
      assert(
        t.name?.trim() &&
          Number.isInteger(Number(t.capacity)) &&
          Number(t.capacity) > 0 &&
          Number.isFinite(Number(t.price)) &&
          Number(t.price) >= 0,
        "Set category names, capacities and non-negative prices.",
      );
    assert(
      r.ticketCategories.reduce((n, t) => n + Number(t.capacity), 0) <=
        Number(r.capacity),
      "Ticket category capacities exceed event capacity.",
    );
  }
  if (
    type === "events" &&
    r.recordType !== "booking" &&
    old?.ticketCategories?.length
  )
    for (const booking of records.filter(
      (b) => b.eventId === r.id && b.ticketCategoryId,
    )) {
      const category = r.ticketCategories?.find(
        (t) => t.id === booking.ticketCategoryId,
      );
      assert(
        category,
        "Keep ticket categories linked to existing reservations.",
      );
      const used = records
        .filter(
          (b) =>
            b.eventId === r.id &&
            b.ticketCategoryId === category.id &&
            ["Confirmed", "Checked in"].includes(b.bookingStatus),
        )
        .reduce((n, b) => n + Number(b.guests), 0);
      assert(
        used <= category.capacity,
        "Category capacity cannot be reduced below reserved places.",
      );
    }
  if (r.recordType === "booking" && r.ticketCategoryId) {
    const event = records.find(
        (x) => x.id === r.eventId && x.orgId === r.orgId,
      ),
      category = event?.ticketCategories?.find(
        (t) => t.id === r.ticketCategoryId,
      );
    assert(category, "Choose an existing ticket category.");
    const used = records
      .filter(
        (x) =>
          x.orgId === r.orgId &&
          x.id !== r.id &&
          x.eventId === r.eventId &&
          x.ticketCategoryId === r.ticketCategoryId &&
          ["Confirmed", "Checked in"].includes(x.bookingStatus),
      )
      .reduce((n, x) => n + Number(x.guests), 0);
    if (["Confirmed", "Checked in"].includes(r.bookingStatus))
      assert(
        used + Number(r.guests) <= Number(category.capacity),
        "Ticket category capacity exceeded.",
      );
    assert(
      old?.ticketCategoryId === r.ticketCategoryId ||
        Number(r.unitPrice) === Number(category.price),
      "Ticket pricing changed; select the category again.",
    );
  }
  if (
    old?.swapRequest?.status === "Pending" &&
    r.swapRequest?.status === "Approved" &&
    r.personId === old.personId
  )
    assert(false, "Use the shift swap decision workflow.");
}
