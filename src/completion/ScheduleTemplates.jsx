import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
export default function ScheduleTemplates({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  canCreate,
  kind,
}) {
  const [message, setMessage] = useState("");
  const type = kind || moduleInfo(module).type,
    templates = records.filter(
      (r) =>
        r.orgId === org.id &&
        r.module === module &&
        r.recordType === type + "-template",
    ),
    people = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "people",
    ),
    assets = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "assets",
    );
  if (!canCreate) return null;
  return (
    <section className="completion-workspace">
      <details>
        <summary>
          {type === "schedule"
            ? "Shift patterns and templates"
            : type === "operations"
              ? "Recurring opening and closing check templates"
              : "Recurring maintenance templates"}
        </summary>
        <p>
          Generate a bounded date range during this browser session. Each
          occurrence checks current qualifications and availability; duplicate
          dates are skipped. No unattended background scheduler runs.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form));
            if (
              await onAdd({
                orgId: org.id,
                module,
                recordType: type + "-template",
                title: f.title,
                status: "Template",
                snapshot: {
                  ...f,
                  checklist: (f.steps || "")
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((text) => ({ text, done: false })),
                },
              })
            ) {
              form.reset();
              setMessage("Reusable template saved.");
            }
          }}
        >
          <label>
            Template title
            <input name="title" required maxLength={100} />
          </label>
          <label>
            Template staff member
            <select name="personId" required>
              <option value="">Choose existing staff</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          {type !== "operations" && (
            <label>
              Required qualification
              <input
                name="requiredQualification"
                maxLength={100}
                placeholder="Optional additional competency"
              />
            </label>
          )}
          <label>
            Template location
            <select name="location">
              {(
                org.workspaceConfig?.operations?.locations || ["Main site"]
              ).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          {type === "maintenance" && (
            <label>
              Template equipment
              <select name="assetRefId" required>
                <option value="">Choose existing equipment</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === "schedule" && (
            <div className="form-pair">
              <label>
                Pattern start time
                <input name="start" type="time" required defaultValue="09:00" />
              </label>
              <label>
                Pattern end time
                <input name="end" type="time" required defaultValue="17:00" />
              </label>
            </div>
          )}
          {type === "operations" && (
            <label>
              Template checklist
              <select name="checkType">
                <option>Opening</option>
                <option>Closing</option>
              </select>
            </label>
          )}
          <label>
            Template instructions
            <textarea name="detail" required />
          </label>
          {type === "maintenance" && (
            <label>
              Work steps (one per line)
              <textarea name="steps" required />
            </label>
          )}
          <button>Save recurring template</button>
        </form>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await onUpdate(org.id, f.templateId, {
                _workflow: {
                  kind: "generateSchedule",
                  from: f.from,
                  to: f.to,
                  interval: Number(f.interval),
                },
              })
            )
              setMessage(
                "Occurrences generated. Existing dates were retained without duplicates.",
              );
          }}
        >
          <label>
            Generate from template
            <select name="templateId" required>
              <option value="">Select saved template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              First occurrence
              <input type="date" name="from" required />
            </label>
            <label>
              Last occurrence
              <input type="date" name="to" required />
            </label>
            <label>
              Repeat every
              <select name="interval">
                <option value="1">Day</option>
                <option value="7">Week</option>
                <option value="14">Fortnight</option>
                <option value="28">Four weeks</option>
              </select>
            </label>
          </div>
          <button>Generate scheduled occurrences</button>
        </form>
        {message && <p role="status">{message}</p>}
      </details>
    </section>
  );
}
