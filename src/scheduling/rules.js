import { moduleInfo } from "../customerModules.js";
import { availabilityAssessment } from "../staffEligibility.js";
export const eventRecord = (r) =>
  moduleInfo(r.module).type === "events" && r.recordType !== "booking";
export const reservationRecord = (r) =>
  r.recordType === "booking" && Boolean(r.eventId);
export const appointmentRecord = (r) =>
  moduleInfo(r.module).type === "bookings" &&
  r.recordType !== "resource" &&
  !reservationRecord(r);
export const activeReservation = (r) =>
  ["Confirmed", "Checked in"].includes(r.bookingStatus);
export const eventReservations = (records, id) =>
  records.filter((r) => reservationRecord(r) && r.eventId === id);
export const eventUsage = (records, id) =>
  eventReservations(records, id)
    .filter(activeReservation)
    .reduce((n, r) => n + Number(r.guests || 1), 0);
export const eventAttendance = (records, id) =>
  eventReservations(records, id)
    .filter((r) => r.bookingStatus === "Checked in")
    .reduce((n, r) => n + Number(r.guests || 1), 0);
export const resourceRecords = (records) =>
  records.filter(
    (r) =>
      moduleInfo(r.module).type === "assets" || r.recordType === "resource",
  );
export const resourcesFor = (r) => [
  ...new Set([...(r.resourceIds || []), r.resourceId].filter(Boolean)),
];
export const assignedIds = (r) => [
  ...new Set(
    [
      ...(r.staffIds || []),
      r.ownerId,
      r.personId,
      r.engineerId,
      r.inspectorId,
      r.driverId,
    ].filter(Boolean),
  ),
];
export const overlaps = (a, b) =>
  Boolean(
    a.startTime &&
    a.endTime &&
    b.startTime &&
    b.endTime &&
    a.startTime < b.endTime &&
    b.startTime < a.endTime,
  );
export const scheduledActive = (r) =>
  !["Cancelled", "Complete", "Completed"].includes(r.status);
export function validDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "")) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10)) &&
    date.getHours() === Number(value.slice(11, 13)) &&
    date.getMinutes() === Number(value.slice(14, 16))
  );
}
export function validateInterval(start, end) {
  if (!validDateTime(start) || !validDateTime(end) || end <= start)
    throw new Error(
      "Choose valid start and end times; the end must be after the start.",
    );
}
const known = (records, id, type) =>
  records.find(
    (r) => r.id === id && (!type || moduleInfo(r.module).type === type),
  );
export function validateScheduledRecord(record, previous, records, org) {
  const all = records.filter((r) => r.orgId === record.orgId),
    type = moduleInfo(record.module).type;
  if (record.customerId && !known(all, record.customerId, "crm"))
    throw new Error("Choose an existing CRM customer.");
  if (
    record.contactId &&
    !known(all, record.customerId, "crm")?.contacts?.some(
      (c) => c.id === record.contactId,
    )
  )
    throw new Error("Select a contact belonging to this customer.");
  if (
    record.eventId &&
    !all.some((r) => r.id === record.eventId && eventRecord(r))
  )
    throw new Error("Choose an existing event.");
  if (reservationRecord(record)) {
    const event = all.find((r) => r.id === record.eventId && eventRecord(r));
    if (!event || !org.modules.includes(event.module))
      throw new Error("Choose an accessible existing event.");
    if (
      !Number.isSafeInteger(Number(record.guests)) ||
      Number(record.guests) < 1
    )
      throw new Error("Places must be a positive whole number.");
    if (
      !["Confirmed", "Waitlist", "Checked in", "Cancelled"].includes(
        record.bookingStatus,
      )
    )
      throw new Error("Choose a valid booking status.");
    if (record.customerId && !known(all, record.customerId, "crm"))
      throw new Error("Choose an existing CRM customer.");
    if (record.schedulingVersion && !record.customerId)
      throw new Error("Select an existing CRM customer for the booking.");
    if (
      (!previous && record.bookingStatus === "Checked in") ||
      (previous &&
        record.bookingStatus === "Checked in" &&
        !["Confirmed", "Checked in"].includes(previous.bookingStatus))
    )
      throw new Error("Confirm the reservation before checking in.");
    if (activeReservation(record)) {
      if (!scheduledActive(event) && !(previous && activeReservation(previous)))
        throw new Error(
          "This event is complete or cancelled; new reservations are unavailable.",
        );
      if (
        eventUsage(
          all.filter((r) => r.id !== record.id),
          event.id,
        ) +
          Number(record.guests) >
        Number(event.capacity)
      )
        throw new Error(
          "Not enough places. Reduce the group size or choose the waiting list.",
        );
    }
    if (
      !Number.isFinite(Number(record.unitPrice || 0)) ||
      Number(record.unitPrice || 0) < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(String(record.unitPrice || 0))
    )
      throw new Error(
        "Enter a non-negative price with at most two decimal places.",
      );
    return;
  }
  if (
    (eventRecord(record) || appointmentRecord(record)) &&
    record.schedulingVersion
  ) {
    validateInterval(record.startTime, record.endTime);
    if (!String(record.title || "").trim()) throw new Error("Enter a title.");
    if (eventRecord(record)) {
      if (
        !Number.isSafeInteger(Number(record.capacity)) ||
        Number(record.capacity) < 1
      )
        throw new Error("Event capacity must be a positive whole number.");
      if (eventUsage(all, record.id) > Number(record.capacity))
        throw new Error(
          "Capacity cannot be below the places already reserved.",
        );
      if (record.status === "Cancelled" && eventUsage(all, record.id))
        throw new Error("Cancel active bookings before cancelling the event.");
    }
    if (
      previous &&
      ["Complete", "Cancelled"].includes(previous.status) &&
      record.status !== previous.status
    )
      throw new Error(
        "This completed or cancelled schedule is retained as history. Duplicate it for new work.",
      );
    if (
      appointmentRecord(record) &&
      !["Confirmed", "Complete", "Cancelled"].includes(record.status)
    )
      throw new Error("Choose a valid appointment status.");
    if (
      appointmentRecord(record) &&
      record.status === "Complete" &&
      !String(record.outcome || "").trim()
    )
      throw new Error("Record an outcome before completing the appointment.");
    if (record.customerId && !known(all, record.customerId, "crm"))
      throw new Error("Choose an existing CRM customer.");
    if (record.bookingType === "Customer visit" && !record.customerId)
      throw new Error("Select a CRM customer for a customer appointment.");
    if (appointmentRecord(record) && !record.personId)
      throw new Error("Select an eligible staff member.");
    if (scheduledActive(record)) {
      for (const id of assignedIds(record)) {
        const person = known(all, id, "people");
        if (!person)
          throw new Error("Select staff from the existing directory.");
        const assessment = availabilityAssessment(person, all, record.orgId, {
          kind: type,
          date: record.startTime,
          startTime: record.startTime,
          endTime: record.endTime,
          excludedRecordId: record.id,
          requiredQualification:
            record.bookingType === "Site inspection"
              ? "Safety inspection"
              : record.requiredQualification,
        });
        if (!assessment.eligible)
          throw new Error(person.title + ": " + assessment.reasons.join("; "));
      }
      for (const id of resourcesFor(record)) {
        const resource = all.find(
          (r) =>
            r.id === id &&
            (moduleInfo(r.module).type === "assets" ||
              r.recordType === "resource"),
        );
        if (!resource)
          throw new Error("Choose an existing asset or registered resource.");
        if (["Out of service", "Needs attention"].includes(resource.condition))
          throw new Error(
            resource.title + " is unavailable: " + resource.condition + ".",
          );
        const conflict = all.find(
          (r) =>
            r.id !== record.id &&
            scheduledActive(r) &&
            (eventRecord(r) || appointmentRecord(r)) &&
            resourcesFor(r).includes(id) &&
            overlaps(r, record),
        );
        if (conflict)
          throw new Error(
            resource.title + " is already reserved for " + conflict.title + ".",
          );
      }
    }
  }
  if (type === "finance" && record.bookingId) {
    const booking = all.find(
      (r) => r.id === record.bookingId && reservationRecord(r),
    );
    if (
      !booking ||
      (!previous && !activeReservation(booking)) ||
      !booking.customerId ||
      booking.customerId !== record.customerId
    )
      throw new Error(
        "Invoice requires a confirmed booking and its linked customer.",
      );
    if (
      all.some(
        (r) =>
          r.id !== record.id &&
          r.bookingId === record.bookingId &&
          r.recordType === "invoice",
      )
    )
      throw new Error("This booking already has an invoice.");
  }
  if (record.followUpForId) {
    const appointment = all.find(
      (r) => r.id === record.followUpForId && appointmentRecord(r),
    );
    if (
      !appointment ||
      appointment.status !== "Complete" ||
      appointment.customerId !== record.customerId
    )
      throw new Error(
        "Follow-up requires a completed appointment and the same customer.",
      );
    if (
      all.some(
        (r) => r.id !== record.id && r.followUpForId === record.followUpForId,
      )
    )
      throw new Error("This appointment already has a follow-up task.");
  }
}
export function endAfter(start, minutes = 60) {
  if (!validDateTime(start)) return "";
  const d = new Date(start);
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function calendarDays(date, view) {
  const base = new Date(date + "T12:00:00");
  if (view === "Month") base.setDate(1);
  else if (view === "Week")
    base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const count =
    view === "Month"
      ? new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
      : view === "Week"
        ? 7
        : 1;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}
