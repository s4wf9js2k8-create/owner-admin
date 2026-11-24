import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
import { eligibleStaff } from "../staffEligibility";
export default function AssignmentPolicy({
  record: r,
  records,
  onUpdate,
  canEdit,
}) {
  const kind = moduleInfo(r.module).type,
    key = {
      maintenance: "engineerId",
      inspections: "inspectorId",
      schedule: "personId",
      bookings: "personId",
      fleet: "driverId",
    }[kind];
  const [department, setDepartment] = useState(r.requiredDepartment || ""),
    [qualification, setQualification] = useState(r.requiredQualification || ""),
    [person, setPerson] = useState(r[key] || ""),
    [message, setMessage] = useState("");
  if (!key) return null;
  const people = records.filter(
      (x) => x.orgId === r.orgId && moduleInfo(x.module).type === "people",
    ),
    qualifications = [
      ...new Set(
        records
          .filter(
            (x) =>
              x.orgId === r.orgId &&
              moduleInfo(x.module).type === "training" &&
              x.qualification,
          )
          .map((x) => x.qualification),
      ),
    ],
    eligible = eligibleStaff(records, r.orgId, {
      kind,
      date: r.startTime || r.dueDate || new Date().toISOString().slice(0, 10),
      startTime: r.startTime,
      endTime: r.endTime,
      excludedRecordId: r.id,
      department,
      requiredQualification: qualification,
    });
  return (
    <details className="completion-workspace">
      <summary>Assignment requirements</summary>
      <p>
        Choose a recorded competency or department, then assign a person
        eligible for this record's dates. Daily vehicle checks re-evaluate the
        same requirements on the check date.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const p = eligible.eligible.find((p) => p.id === person);
          const patch = {
            requiredDepartment: department,
            requiredQualification: qualification,
            [key]: p?.id || "",
          };
          if (kind === "maintenance")
            Object.assign(patch, {
              ownerId: p?.id || "",
              owner: p?.title || "",
            });
          if (kind === "schedule")
            Object.assign(patch, {
              person: p?.title || "",
              ownerId: p?.id || "",
              owner: p?.title || "",
            });
          if (await onUpdate(r.orgId, r.id, patch))
            setMessage("Assignment requirements saved.");
        }}
      >
        <label>
          Required department
          <select
            aria-label="Required department"
            disabled={!canEdit}
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPerson("");
            }}
          >
            <option value="">All departments</option>
            {[
              ...new Set(
                [
                  department,
                  ...people.map((p) => p.department || p.team),
                ].filter(Boolean),
              ),
            ].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Required qualification
          <select
            aria-label="Required qualification"
            disabled={!canEdit}
            value={qualification}
            onChange={(e) => {
              setQualification(e.target.value);
              setPerson("");
            }}
          >
            <option value="">Default module competency</option>
            {[
              ...new Set([qualification, ...qualifications].filter(Boolean)),
            ].map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
        </label>
        <label>
          Eligible assignment
          <select
            aria-label="Eligible assignment"
            disabled={!canEdit}
            value={eligible.eligible.some((p) => p.id === person) ? person : ""}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="">Unassigned</option>
            {eligible.eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        {!!eligible.excluded.length && (
          <details>
            <summary>Why other staff are unavailable</summary>
            {eligible.excluded.map((p) => (
              <p key={p.id}>
                {p.title}: {p.assessment.reasons.join("; ")}
              </p>
            ))}
          </details>
        )}
        {canEdit && <button>Save assignment requirements</button>}
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
