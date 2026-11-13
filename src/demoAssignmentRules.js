import { moduleInfo } from "./customerModules.js";
import { availabilityAssessment } from "./staffEligibility.js";
export function validateDemoAssignment(
  record,
  patch,
  records,
  creating = false,
) {
  const kind = moduleInfo(record.module).type;
  if (
    ![
      "schedule",
      "bookings",
      "maintenance",
      "inspections",
      "projects",
      "fleet",
      "safety",
    ].includes(kind)
  )
    return;
  const keys = [
    "personId",
    "ownerId",
    "engineerId",
    "inspectorId",
    "owner",
    "person",
    "inspector",
    "startTime",
    "endTime",
    "dueDate",
  ];
  if (!creating && !keys.some((key) => key in patch)) return;
  const id =
    record.engineerId ||
    record.inspectorId ||
    record.ownerId ||
    (["schedule", "bookings", "fleet"].includes(kind) ? record.personId : "");
  const name =
    record.owner ||
    record.inspector ||
    (["schedule"].includes(kind) ? record.person : "");
  if (!id && !name) return;
  const person = records.find(
    (p) =>
      p.orgId === record.orgId &&
      moduleInfo(p.module).type === "people" &&
      (id ? p.id === id : p.title === name),
  );
  if (!person) throw new Error("Select an existing staff profile.");
  const assessment = availabilityAssessment(person, records, record.orgId, {
    kind,
    date: record.startTime || record.dueDate,
    startTime: record.startTime,
    endTime: record.endTime,
    excludedRecordId: record.id,
    department: record.requiredDepartment,
    requiredQualification: record.requiredQualification,
  });
  if (!assessment.eligible) throw new Error(assessment.reasons.join("; "));
}
