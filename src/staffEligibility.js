import { moduleInfo } from "./customerModules.js";

const typeOf = (record) => moduleInfo(record.module).type;
const datePart = (value) => String(value || "").slice(0, 10);
const dayOf = (value) =>
  datePart(value) || new Date().toISOString().slice(0, 10);
const normal = (text) =>
  String(text || "")
    .trim()
    .toLowerCase();

export const assignmentRequirements = {
  maintenance: {
    label: "Maintenance / engineering",
    terms: [
      "maintenance",
      "engineering",
      "mechanical",
      "electrical",
      "technician",
    ],
  },
  inspections: {
    label: "Inspection competency",
    terms: ["inspection", "inspector", "safety inspection"],
  },
  fleet: {
    label: "Vehicle / driving",
    terms: ["driver", "driving", "vehicle", "fleet"],
  },
  safety: {
    label: "Safety competency",
    terms: ["health and safety", "safety", "risk assessment"],
  },
};
export const requirementFor = (type) => assignmentRequirements[type] || null;
export function availabilityAssessment(
  person,
  records,
  orgId,
  {
    kind = "maintenance",
    date,
    startTime,
    endTime,
    excludedRecordId = "",
    department,
    requiredQualification,
  } = {},
) {
  const day = dayOf(date || startTime);
  // Leave and qualification dates are local calendar dates, not UTC dates.
  // An assignment ending exactly at midnight does not occupy the following day.
  let lastDay =
    endTime && Number.isFinite(Date.parse(endTime)) ? datePart(endTime) : day;
  if (
    endTime &&
    /^00:00(?::00(?:\.000)?)?(?:Z)?$/.test(String(endTime).slice(11))
  ) {
    const previous = new Date(lastDay + "T12:00:00Z");
    if (Number.isFinite(previous.getTime())) {
      previous.setUTCDate(previous.getUTCDate() - 1);
      lastDay = previous.toISOString().slice(0, 10);
    }
  }
  const related = records.filter((r) => r.orgId === orgId);
  const qualifications = related.filter(
    (r) =>
      typeOf(r) === "training" &&
      (r.personId === person.id ||
        (!r.personId && normal(r.person) === normal(person.title))),
  );
  const required = requiredQualification
    ? { label: requiredQualification, terms: [normal(requiredQualification)] }
    : requirementFor(kind);
  const reasons = [];
  const status = normal(
    person.employmentStatus || person.memberStatus || person.staffStatus || "",
  );
  if (!status) reasons.push("Employment status not recorded");
  else if (!["active", "employed", "volunteer"].includes(status))
    reasons.push("Inactive staff profile");
  if (
    department &&
    normal(person.department || person.team) !== normal(department)
  )
    reasons.push("Required department: " + department);
  if (person.orgId !== orgId)
    reasons.push("Staff profile belongs to another company");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)))
    reasons.push("Valid assignment date required");
  if (
    (startTime || endTime) &&
    (!startTime ||
      !endTime ||
      Number.isNaN(Date.parse(startTime)) ||
      Number.isNaN(Date.parse(endTime)) ||
      endTime <= startTime)
  )
    reasons.push("Valid start and end times required");
  const matching = required
    ? qualifications.filter((q) =>
        [q.qualification, q.title, q.detail].some((v) =>
          required.terms.some((term) => normal(v).includes(term)),
        ),
      )
    : qualifications;
  if (required && !matching.length)
    reasons.push(
      "No recorded " + required.label.toLowerCase() + " qualification",
    );
  else if (
    required &&
    !matching.some(
      (q) =>
        (q.noExpiry === true || (q.expiry && datePart(q.expiry) >= lastDay)) &&
        (!q.validFrom || datePart(q.validFrom) <= day) &&
        !["revoked", "failed", "expired"].includes(normal(q.status)) &&
        q.approval === "Approved",
    )
  )
    reasons.push("Qualification expired, unapproved, or not valid on " + day);
  const leave = related.filter(
    (r) =>
      typeOf(r) === "leave" &&
      (r.personId === person.id ||
        (!r.personId && normal(r.person) === normal(person.title))) &&
      r.approval === "Approved" &&
      r.requestType !== "Available" &&
      datePart(r.startDate) <= lastDay &&
      datePart(r.endDate) >= day,
  );
  if (leave.length) reasons.push("Approved leave on " + day);
  if (person.availabilityMode === "Recorded dates only") {
    const available = related.filter(
      (r) =>
        typeOf(r) === "leave" &&
        r.requestType === "Available" &&
        r.approval === "Approved" &&
        (r.personId === person.id ||
          (!r.personId && r.person === person.title)),
    );
    for (
      let point = Date.parse(day + "T12:00Z"),
        end = Date.parse(lastDay + "T12:00Z");
      point <= end;
      point += 86400000
    ) {
      const d = new Date(point).toISOString().slice(0, 10);
      if (!available.some((r) => r.startDate <= d && r.endDate >= d)) {
        reasons.push("Approved availability not recorded for " + d);
        break;
      }
    }
  }
  const unavailable = related.filter(
    (r) =>
      typeOf(r) === "leave" &&
      (r.personId === person.id ||
        (!r.personId && normal(r.person) === normal(person.title))) &&
      !["Cancelled", "Rejected"].includes(r.approval) &&
      !["Cancelled", "Rejected"].includes(r.status) &&
      ["Unavailable", "Unavailability"].includes(
        r.requestType || r.availabilityStatus,
      ) &&
      datePart(r.startDate) <= lastDay &&
      datePart(r.endDate) >= day,
  );
  if (unavailable.length) reasons.push("Marked unavailable on " + day);
  if (startTime && endTime) {
    const clashes = related.filter(
      (r) =>
        r.id !== excludedRecordId &&
        ([
          ...(r.staffIds || []),
          r.personId,
          r.engineerId,
          r.inspectorId,
          r.driverId,
          r.ownerId,
        ].includes(person.id) ||
          (!(
            r.personId ||
            r.engineerId ||
            r.inspectorId ||
            r.driverId ||
            r.ownerId
          ) &&
            normal(r.person || r.owner || r.inspector) ===
              normal(person.title))) &&
        [
          "schedule",
          "bookings",
          "maintenance",
          "inspections",
          "events",
        ].includes(typeOf(r)) &&
        r.recordType !== "booking" &&
        r.recordType !== "resource" &&
        r.startTime &&
        r.endTime &&
        r.startTime < endTime &&
        startTime < r.endTime &&
        !["Cancelled", "Complete", "Completed"].includes(r.status),
    );
    if (clashes.length)
      reasons.push("Overlapping shift, booking or assignment");
  }
  return { eligible: reasons.length === 0, reasons, qualifications: matching };
}
export function eligibleStaff(records, orgId, criteria = {}) {
  const people = records
    .filter((r) => r.orgId === orgId && typeOf(r) === "people")
    .filter(
      (p, i, list) =>
        list.findIndex((other) => normal(other.title) === normal(p.title)) ===
        i,
    )
    .sort((a, b) => a.title.localeCompare(b.title));
  const assessed = people.map((person) => ({
    ...person,
    assessment: availabilityAssessment(person, records, orgId, criteria),
  }));
  return {
    eligible: assessed.filter((p) => p.assessment.eligible),
    excluded: assessed.filter((p) => !p.assessment.eligible),
    all: assessed,
  };
}
export function validateAssignee(records, orgId, name, criteria = {}) {
  if (!name) return { eligible: true, reasons: [] };
  const person = records.find(
    (p) =>
      p.orgId === orgId &&
      typeOf(p) === "people" &&
      normal(p.title) === normal(name),
  );
  return person
    ? availabilityAssessment(person, records, orgId, criteria)
    : {
        eligible: false,
        reasons: ["Select a person from the staff directory"],
      };
}
