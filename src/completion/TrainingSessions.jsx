import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
import { EvidencePicker } from "./Shared";
export default function TrainingSessions({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  canCreate,
  canApprove,
}) {
  const people = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "people",
    ),
    sessions = records.filter(
      (r) => r.orgId === org.id && r.recordType === "training-session",
    );
  const [selected, setSelected] = useState(""),
    [evidence, setEvidence] = useState(null),
    [message, setMessage] = useState("");
  const current = sessions.find((r) => r.id === selected);
  return (
    <section className="completion-workspace">
      <details>
        <summary>Training sessions and assessments</summary>
        <p>
          Plan group training. Passed assessments create qualifications awaiting
          approval; existing approved certificates are preserved.
        </p>
        {canCreate && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form),
                attendeeIds = f.getAll("attendee");
              if (!attendeeIds.length) {
                setMessage("Select at least one attendee.");
                return;
              }
              const saved = await onAdd({
                orgId: org.id,
                module,
                recordType: "training-session",
                title: f.get("title"),
                qualification: f.get("qualification"),
                startTime: f.get("startTime"),
                location: f.get("location"),
                attendeeIds,
                status: "Planned",
              });
              if (saved) {
                setSelected(saved.id);
                form.reset();
              }
            }}
          >
            <div className="form-pair">
              <label>
                Session title
                <input required name="title" maxLength={100} />
              </label>
              <label>
                Qualification awarded
                <input required name="qualification" maxLength={100} />
              </label>
              <label>
                Session date and time
                <input required type="datetime-local" name="startTime" />
              </label>
              <label>
                Training location
                <select name="location">
                  {(
                    org.workspaceConfig?.operations?.locations ||
                    org.locations || ["Main site"]
                  ).map((l) => (
                    <option key={l}>
                      {typeof l === "string" ? l : l.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset>
              <legend>Attendees</legend>
              {people.map((p) => (
                <label className="task-check" key={p.id}>
                  <input type="checkbox" name="attendee" value={p.id} />
                  {p.title}
                </label>
              ))}
            </fieldset>
            <button>Schedule training session</button>
          </form>
        )}
        <label>
          Review session
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setEvidence(null);
            }}
          >
            <option value="">Select a session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.status}
              </option>
            ))}
          </select>
        </label>
        {current && (
          <>
            <h3>{current.title}</h3>
            <p>
              {current.startTime?.replace("T", " ")} · {current.qualification}
            </p>
            {canApprove && current.status !== "Complete" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget),
                    results = Object.fromEntries(
                      current.attendeeIds.map((id) => [id, f.get(id)]),
                    );
                  if (
                    await onUpdate(org.id, current.id, {
                      _workflow: {
                        kind: "assessTraining",
                        results,
                        expiry: f.get("expiry"),
                        noExpiry: f.get("noExpiry") === "on",
                        evidence,
                      },
                    })
                  )
                    setMessage(
                      "Assessment saved. Passed qualifications are now in the competency matrix awaiting approval.",
                    );
                }}
              >
                {current.attendeeIds.map((id) => (
                  <label key={id}>
                    {people.find((p) => p.id === id)?.title ||
                      "Unavailable staff record"}
                    <select name={id} required>
                      <option value="">Record assessment</option>
                      <option>Pass</option>
                      <option>Fail</option>
                    </select>
                  </label>
                ))}
                <label>
                  Certificate expiry
                  <input
                    type="date"
                    name="expiry"
                    min={current.startTime?.slice(0, 10)}
                  />
                </label>
                <label className="task-check">
                  <input type="checkbox" name="noExpiry" />
                  Qualification has no expiry
                </label>
                <EvidencePicker value={evidence} onChange={setEvidence} />
                <button>Save assessment results</button>
              </form>
            )}
            <ul>
              {records
                .filter((r) => r.sourceSessionId === current.id)
                .map((q) => (
                  <li key={q.id}>
                    {people.find((p) => p.id === q.personId)?.title} ·{" "}
                    {q.assessmentResult} · {q.approval}
                    {q.evidence?.data && (
                      <a href={q.evidence.data} download={q.evidence.name}>
                        {" "}
                        Local certificate evidence
                      </a>
                    )}
                  </li>
                ))}
            </ul>
          </>
        )}
        {message && <p role="status">{message}</p>}
      </details>
    </section>
  );
}
