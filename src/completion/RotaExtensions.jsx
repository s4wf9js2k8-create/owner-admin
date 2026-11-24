import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
import { qualifiedCoverage } from "./finalRules";
export function StaffingRequirements({ org, records, onConfigure, canManage }) {
  const [message, setMessage] = useState(""),
    rules = org.workspaceConfig?.operations?.staffingRequirements || [],
    qualifications = [
      ...new Set(
        records
          .filter(
            (r) =>
              r.orgId === org.id &&
              moduleInfo(r.module).type === "training" &&
              r.qualification,
          )
          .map((r) => r.qualification),
      ),
    ];
  return (
    <details className="completion-workspace">
      <summary>Qualified staffing requirements</summary>
      <p>
        Requirements measure the minimum qualified staff concurrently scheduled
        throughout the chosen time window.
      </p>
      {rules.map((r) => (
        <p key={r.id}>
          {r.qualification}: {r.minimum} · {r.start}–{r.end} ·{" "}
          {r.location || "All locations"}{" "}
          {canManage && (
            <button
              onClick={() =>
                onConfigure(
                  {
                    workspaceConfig: {
                      operations: {
                        ...org.workspaceConfig?.operations,
                        staffingRequirements: rules.filter(
                          (x) => x.id !== r.id,
                        ),
                      },
                    },
                  },
                  "Removed staffing requirement",
                )
              }
            >
              Remove requirement
            </button>
          )}
        </p>
      ))}
      {canManage && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (f.end <= f.start) {
              setMessage("End must follow start.");
              return;
            }
            if (
              await onConfigure(
                {
                  workspaceConfig: {
                    operations: {
                      ...org.workspaceConfig?.operations,
                      staffingRequirements: [
                        ...rules,
                        {
                          ...f,
                          id: crypto.randomUUID(),
                          minimum: Number(f.minimum),
                        },
                      ],
                    },
                  },
                },
                "Added qualified staffing requirement",
              )
            )
              setMessage("Staffing requirement saved.");
          }}
        >
          <label>
            Required competency
            <select name="qualification" required>
              <option value="">Choose a recorded qualification</option>
              {qualifications.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              Minimum qualified staff
              <input
                name="minimum"
                type="number"
                min="1"
                max="50"
                required
                defaultValue="1"
              />
            </label>
            <label>
              Requirement location
              <select name="location">
                <option value="">All locations</option>
                {(org.workspaceConfig?.operations?.locations || []).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Required from
              <input type="time" name="start" required defaultValue="09:00" />
            </label>
            <label>
              Required until
              <input type="time" name="end" required defaultValue="17:00" />
            </label>
          </div>
          <button>Save staffing requirement</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
export function CoverageWarnings({ days, records, orgId, shifts, operations }) {
  return (
    <div className="qualified-coverage">
      {days.flatMap((date) =>
        (operations?.staffingRequirements || [])
          .filter(
            () =>
              !operations?.days ||
              operations.days.includes(new Date(date + "T12:00Z").getUTCDay()),
          )
          .map((r) => {
            const actual = qualifiedCoverage(
              records,
              orgId,
              shifts,
              date,
              r,
              operations,
            );
            return (
              <p
                key={date + r.id}
                className={actual < r.minimum ? "rota-warning" : ""}
              >
                {date} · {r.qualification} · {actual} / {r.minimum} qualified
                throughout {r.start}–{r.end}
                {actual < r.minimum ? " · COVERAGE SHORTFALL" : " · Covered"}
              </p>
            );
          }),
      )}
    </div>
  );
}
export function ShiftSwaps({
  org,
  shift,
  records,
  onUpdate,
  canEdit,
  canApprove,
  actorId,
}) {
  const [message, setMessage] = useState(""),
    shifts = records.filter(
      (r) =>
        r.orgId === org.id &&
        moduleInfo(r.module).type === "schedule" &&
        r.id !== shift.id &&
        r.personId &&
        r.personId !== shift.personId &&
        !r.recordType?.endsWith("template"),
    ),
    people = records.filter(
      (r) =>
        r.orgId === org.id &&
        moduleInfo(r.module).type === "people" &&
        r.employmentStatus === "Active",
    ),
    request = shift.swapRequest;
  return (
    <section className="completion-workspace">
      <h3>Shift swap</h3>
      {request && (
        <p>
          {request.status} · {request.reason} ·{" "}
          {records.find((r) => r.id === request.targetId)?.title ||
            "Target shift unavailable"}
          {request.comment ? " · " + request.comment : ""}
        </p>
      )}
      {canEdit && request?.status !== "Pending" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await onUpdate(org.id, shift.id, {
                _workflow: { kind: "requestSwap", ...f },
              })
            )
              setMessage("Swap submitted for supervisor review.");
          }}
        >
          <label>
            Swap with shift
            <select name="targetId" required>
              <option value="">Choose another employee’s shift</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.person} · {s.startTime?.replace("T", " ")} · {s.location}
                </option>
              ))}
            </select>
          </label>
          <label>
            Swap reason
            <input name="reason" required maxLength={300} />
          </label>
          <button>Request shift exchange</button>
        </form>
      )}
      {canApprove && request?.status === "Pending" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await onUpdate(org.id, shift.id, {
                _workflow: { kind: "decideSwap", ...f },
              })
            )
              setMessage(
                "Swap decision recorded. Both assignments were validated together.",
              );
          }}
        >
          <p>
            Reviewing as{" "}
            {people.find((p) => p.id === actorId)?.title ||
              "no active staff profile"}
            . Select another Working as profile to avoid self-approval.
          </p>
          <input type="hidden" name="reviewerId" value={actorId || ""} />
          <label>
            Swap decision
            <select name="decision">
              <option>Approve</option>
              <option>Reject</option>
            </select>
          </label>
          <label>
            Decision reason
            <input name="comment" required />
          </label>
          <button>Record swap decision</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
