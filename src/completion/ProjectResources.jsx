import React, { useState } from "react";
import { QualifiedStaffSelect } from "../LinkedSelectors";
import { eligibleStaff } from "../staffEligibility";
import { moduleInfo } from "../customerModules";
export default function ProjectResources({
  project: p,
  records,
  onUpdate,
  onNavigate,
  canEdit,
}) {
  const [deadline, setDeadline] = useState(p.dueDate || ""),
    [message, setMessage] = useState("");
  const people = records.filter(
      (r) => r.orgId === p.orgId && moduleInfo(r.module).type === "people",
    ),
    assets = records.filter(
      (r) => r.orgId === p.orgId && moduleInfo(r.module).type === "assets",
    ),
    jobs = records.filter(
      (r) =>
        r.orgId === p.orgId &&
        r.projectId === p.id &&
        moduleInfo(r.module).type === "maintenance",
    ),
    times = records.filter(
      (r) =>
        r.orgId === p.orgId &&
        r.projectId === p.id &&
        moduleInfo(r.module).type === "timesheets",
    );
  const assessed = eligibleStaff(records, p.orgId, {
      kind: "projects",
      date: p.dueDate || new Date().toISOString().slice(0, 10),
      excludedRecordId: p.id,
    }),
    eligibleIds = new Set(assessed.eligible.map((s) => s.id));
  const hours = times.reduce(
      (n, t) =>
        n +
        (t.startTime && t.endTime
          ? Math.max(
              0,
              (Date.parse(t.endTime) - Date.parse(t.startTime)) / 3600000 -
                Number(t.breakMinutes || 0) / 60,
            )
          : 0),
      0,
    ),
    cost = (p.costs || []).reduce((n, c) => n + Number(c.amount || 0), 0);
  return (
    <section className="completion-workspace">
      {canEdit && (
        <details>
          <summary>Edit project brief, manager and deadline</summary>
          <form
            key={p.id}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)),
                lead = people.find((s) => s.title === f.manager);
              if (
                await onUpdate(p.orgId, p.id, {
                  title: f.title,
                  detail: f.detail,
                  dueDate: f.dueDate,
                  leadId: lead?.id || "",
                  ownerId: lead?.id || "",
                  owner: lead?.title || "",
                  risk: f.risk,
                })
              )
                setMessage("Project brief saved.");
            }}
          >
            <label>
              Project name
              <input name="title" required defaultValue={p.title} />
            </label>
            <label>
              Project brief
              <textarea name="detail" defaultValue={p.detail} />
            </label>
            <label>
              Project deadline
              <input
                type="date"
                name="dueDate"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
            <QualifiedStaffSelect
              records={records}
              orgId={p.orgId}
              kind="projects"
              date={deadline}
              name="manager"
              label="Project manager"
              value={p.owner}
              required
            />
            <label>
              Project risk level
              <select name="risk" defaultValue={p.risk || "Low"}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <button>Save project brief</button>
            {message && <p role="status">{message}</p>}
          </form>
        </details>
      )}
      <details>
        <summary>Project team, resources and budget controls</summary>
        {canEdit && (
          <form
            key={p.id}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await onUpdate(p.orgId, p.id, {
                memberIds: f.getAll("member"),
                resourceIds: f.getAll("resource"),
                budget: Number(f.get("budget")),
                riskNotes: f.get("risks"),
              });
            }}
          >
            <fieldset>
              <legend>Existing project team</legend>
              {people
                .filter(
                  (s) => eligibleIds.has(s.id) || p.memberIds?.includes(s.id),
                )
                .map((s) => (
                  <label className="task-check" key={s.id}>
                    <input
                      type="checkbox"
                      name="member"
                      value={s.id}
                      disabled={!eligibleIds.has(s.id)}
                      defaultChecked={p.memberIds?.includes(s.id)}
                    />
                    {s.title}
                    {!eligibleIds.has(s.id) && (
                      <>
                        <input name="member" type="hidden" value={s.id} />
                        <span>
                          {" "}
                          · Existing member unavailable; remove or reassign
                          before rescheduling.
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate(p.orgId, p.id, {
                              memberIds: p.memberIds.filter(
                                (id) => id !== s.id,
                              ),
                            })
                          }
                        >
                          Remove unavailable member
                        </button>
                      </>
                    )}
                  </label>
                ))}
            </fieldset>
            {!!assessed.excluded.length && (
              <details>
                <summary>Why other team members are unavailable</summary>
                {assessed.excluded.map((s) => (
                  <p key={s.id}>
                    {s.title}: {s.assessment.reasons.join("; ")}
                  </p>
                ))}
              </details>
            )}
            <fieldset>
              <legend>Project equipment</legend>
              {assets.map((a) => (
                <label className="task-check" key={a.id}>
                  <input
                    type="checkbox"
                    name="resource"
                    value={a.id}
                    defaultChecked={p.resourceIds?.includes(a.id)}
                  />
                  {a.title}
                </label>
              ))}
            </fieldset>
            <label>
              Approved project budget (£)
              <input
                name="budget"
                type="number"
                min="0"
                step=".01"
                max="100000000"
                required
                defaultValue={p.budget || 0}
              />
            </label>
            <label>
              Project risks and mitigation
              <textarea name="risks" defaultValue={p.riskNotes || ""} />
            </label>
            <button>Save project resources</button>
          </form>
        )}
        <p>
          Allocated staff:{" "}
          {(p.memberIds || [])
            .map(
              (id) =>
                people.find((s) => s.id === id)?.title ||
                "Unavailable staff record",
            )
            .join(", ") || "No linked team members"}
        </p>
        <p>
          Equipment:{" "}
          {(p.resourceIds || [])
            .map(
              (id) =>
                assets.find((a) => a.id === id)?.title ||
                "Unavailable equipment",
            )
            .join(", ") || "None allocated"}
        </p>
        <p>
          {hours.toFixed(2)} attendance hours allocated · £{cost.toFixed(2)}{" "}
          recorded costs · £{(Number(p.budget || 0) - cost).toFixed(2)} budget
          remaining
        </p>
        {p.riskNotes && <p>{p.riskNotes}</p>}
        {canEdit && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = Object.fromEntries(new FormData(form));
              if (
                await onUpdate(p.orgId, p.id, {
                  costs: [
                    ...(p.costs || []),
                    { id: crypto.randomUUID(), ...f, amount: Number(f.amount) },
                  ],
                })
              )
                form.reset();
            }}
          >
            <label>
              Cost description
              <input name="description" required maxLength={120} />
            </label>
            <label>
              Actual cost (£, fictional)
              <input
                name="amount"
                type="number"
                min=".01"
                step=".01"
                max="100000000"
                required
              />
            </label>
            <label>
              Cost date
              <input name="date" type="date" required />
            </label>
            <button>Record project cost</button>
          </form>
        )}
        {(p.costs || []).map((c) => (
          <p key={c.id}>
            {c.date} · {c.description} · £{Number(c.amount).toFixed(2)}
          </p>
        ))}
        <h3>Project maintenance</h3>
        {jobs.map((j) => (
          <button
            key={j.id}
            onClick={() => onNavigate(j.module, { recordId: j.id })}
          >
            {j.title} · {j.status}
          </button>
        ))}
      </details>
    </section>
  );
}
