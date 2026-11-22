import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
import { EvidencePicker } from "./Shared";
export default function WorkOrderExtras({
  org,
  record: r,
  records,
  onUpdate,
  canEdit,
}) {
  const [message, setMessage] = useState("");
  return (
    <section className="completion-workspace">
      <details>
        <summary>Job schedule, project and work evidence</summary>
        {canEdit && (
          <form
            key={r.id}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                (f.startTime || f.endTime) &&
                (!f.startTime || !f.endTime || f.endTime <= f.startTime)
              ) {
                setMessage("Set a start and later end for scheduled work.");
                return;
              }
              if (await onUpdate(org.id, r.id, f))
                setMessage(
                  "Work schedule and project updated. Assignment eligibility was checked.",
                );
            }}
          >
            <label>
              Work deadline
              <input
                name="dueDate"
                type="date"
                required
                defaultValue={r.dueDate || ""}
              />
            </label>
            <div className="form-pair">
              <label>
                Scheduled work starts
                <input
                  type="datetime-local"
                  name="startTime"
                  defaultValue={r.startTime || ""}
                />
              </label>
              <label>
                Scheduled work ends
                <input
                  type="datetime-local"
                  name="endTime"
                  defaultValue={r.endTime || ""}
                />
              </label>
            </div>
            <label>
              Associated project
              <select name="projectId" defaultValue={r.projectId || ""}>
                <option value="">No project</option>
                {records
                  .filter(
                    (p) =>
                      p.orgId === org.id &&
                      moduleInfo(p.module).type === "projects" &&
                      p.recordType === "project",
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </label>
            <button>Save work schedule</button>
          </form>
        )}
        {canEdit && (
          <EvidencePicker
            multiple
            label="Before and after local work evidence"
            value={r.workEvidence || []}
            onChange={(files) =>
              onUpdate(org.id, r.id, {
                workEvidence: [...(r.workEvidence || []), ...files],
              })
            }
          />
        )}
        <p>Evidence is stored only in this browser session.</p>
        {!canEdit &&
          (r.workEvidence || []).map((f) => (
            <p key={f.id}>
              <a href={f.data} download={f.name}>
                {f.name}
              </a>
            </p>
          ))}
        {message && <p role="status">{message}</p>}
      </details>
    </section>
  );
}
