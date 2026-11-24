import React, { useState, useEffect } from "react";
import { Modal, Status, Empty } from "../components";
import { moduleInfo } from "../customerModules";
import { eligibleStaff } from "../staffEligibility";
import { EvidencePicker, History, TabBar } from "./Shared";
const day = () => new Date().toISOString().slice(0, 10);
export default function SafetyWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onNavigate,
  canCreate,
  canEdit,
  canApprove,
  focusId,
}) {
  const rows = records.filter((r) => r.orgId === org.id && r.module === module),
    people = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "people",
    ),
    assets = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "assets",
    );
  const [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [filter, setFilter] = useState("All"),
    [search, setSearch] = useState(""),
    [evidence, setEvidence] = useState(null),
    [message, setMessage] = useState(""),
    [target, setTarget] = useState("projects"),
    [actionDate, setActionDate] = useState(day()),
    [reviewDate, setReviewDate] = useState(day());
  useEffect(() => {
    if (focusId) setSelected(focusId);
  }, [focusId]);
  const reviewers = eligibleStaff(records, org.id, {
    kind: "safety",
    date: reviewDate,
  });
  const current = rows.find((r) => r.id === selected),
    eligible = eligibleStaff(records, org.id, {
      kind: target === "maintenance" ? "maintenance" : "projects",
      date: actionDate,
    }),
    corrective = records.find((r) => r.id === current?.correctiveId);
  const severity = (r) => Number(r.likelihood || 0) * Number(r.impact || 0),
    save = (r, patch) => onUpdate(org.id, r.id, patch);
  return (
    <div className="completion-workspace safety-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">HEALTH & SAFETY</span>
          <h2>Safety and risk register</h2>
          <p>
            Report concerns, assess controls and track linked corrective work.
            Fictional records do not establish legal compliance.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setCreating(true);
              setEvidence(null);
            }}
          >
            Report safety concern
          </button>
        )}
      </div>
      <TabBar
        tabs={["All", "Hazard", "Incident", "Near miss", "Risk assessment"]}
        current={filter}
        setCurrent={setFilter}
      />
      <label>
        Find safety record
        <input value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <div className="purpose-grid">
        {rows
          .filter(
            (r) =>
              (filter === "All" || r.incidentType === filter) &&
              [r.title, r.detail, r.location]
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
          .map((r) => (
            <article key={r.id} className="purpose-card">
              <span className="eyebrow">
                {r.incidentType || "Hazard"} ·{" "}
                {r.location || "Location not recorded"}
              </span>
              <h3>{r.title}</h3>
              <Status>{r.status}</Status>
              <p>{r.detail}</p>
              <p>
                {severity(r)
                  ? `Risk score ${severity(r)} / 25`
                  : r.severity || "Assessment required"}
                {r.reviewDate && r.reviewDate < day()
                  ? " · Review overdue"
                  : ""}
              </p>
              <button
                onClick={() => {
                  setSelected(r.id);
                  setReviewDate(r.reviewDate || day());
                }}
              >
                Review safety record
              </button>
            </article>
          ))}
      </div>
      {!rows.length && (
        <Empty>
          No concerns recorded. Report a hazard, near miss or incident to begin
          a review.
        </Empty>
      )}
      {creating && (
        <Modal title="Report safety concern" onClose={() => setCreating(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const saved = await onAdd({
                ...f,
                orgId: org.id,
                module,
                status: "Reported",
                recordType: "safety-record",
                severity: "Medium",
                evidence,
              });
              if (saved) {
                setSelected(saved.id);
                setCreating(false);
              }
            }}
          >
            <label>
              Concern title
              <input required name="title" maxLength={100} />
            </label>
            <label>
              Report type
              <select name="incidentType">
                {["Hazard", "Incident", "Near miss", "Risk assessment"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              What happened or could happen?
              <textarea required name="detail" maxLength={2000} />
            </label>
            <label>
              Location
              <select name="location">
                {(
                  org.workspaceConfig?.operations?.locations || ["Main site"]
                ).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Reported by
              <select name="personId" required>
                <option value="">Choose staff member</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <EvidencePicker value={evidence} onChange={setEvidence} />
            <button>Save safety report</button>
          </form>
        </Modal>
      )}
      {current && (
        <Modal title={current.title} onClose={() => setSelected("")}>
          <p>{current.detail}</p>
          <Status>{current.status}</Status>
          {canEdit && (
            <form
              key={current.id}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                if (
                  await save(current, {
                    ...f,
                    likelihood: Number(f.likelihood),
                    impact: Number(f.impact),
                  })
                )
                  setMessage("Risk assessment saved.");
              }}
            >
              <label>
                Who may be affected?
                <input
                  required
                  name="affected"
                  defaultValue={current.affected || ""}
                />
              </label>
              <div className="form-pair">
                {[
                  ["likelihood", "Likelihood"],
                  ["impact", "Severity"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label} (1–5)
                    <input
                      name={key}
                      type="number"
                      min="1"
                      max="5"
                      step="1"
                      required
                      defaultValue={current[key] || 1}
                    />
                  </label>
                ))}
              </div>
              <label>
                Existing controls
                <textarea
                  name="controls"
                  required
                  defaultValue={current.controls || ""}
                />
              </label>
              <label>
                Required corrective action
                <textarea
                  required
                  name="action"
                  defaultValue={current.action || ""}
                />
              </label>
              <label>
                Responsible staff
                <select
                  name="ownerId"
                  required
                  defaultValue={current.ownerId || current.personId || ""}
                >
                  <option value="">Choose responsible person</option>
                  {reviewers.eligible.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Review date
                <input
                  type="date"
                  name="reviewDate"
                  required
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                />
              </label>
              <button>Save risk assessment</button>
            </form>
          )}
          <h3>Corrective work</h3>
          {corrective ? (
            <p>
              <button
                onClick={() =>
                  onNavigate(corrective.module, { recordId: corrective.id })
                }
              >
                {corrective.title} · {corrective.status}
              </button>
            </p>
          ) : (
            canCreate && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  if (
                    await save(current, {
                      _workflow: { kind: "correctiveSafety", ...f, target },
                    })
                  )
                    setMessage("Corrective work created and linked.");
                }}
              >
                <label>
                  Action type
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="projects">Assigned task</option>
                    {org.modules.some(
                      (m) => moduleInfo(m).type === "maintenance",
                    ) && (
                      <option value="maintenance">
                        Maintenance work order
                      </option>
                    )}
                  </select>
                </label>
                <label>
                  Assigned employee
                  <select required name="personId">
                    <option value="">Choose eligible employee</option>
                    {eligible.eligible.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <details>
                  <summary>Eligibility exclusions</summary>
                  {eligible.excluded.map((p) => (
                    <p key={p.id}>
                      {p.title}: {p.assessment.reasons.join("; ")}
                    </p>
                  ))}
                </details>
                {target === "maintenance" && (
                  <label>
                    Related asset
                    <select name="assetRefId" required>
                      <option value="">Select asset</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Action deadline
                  <input
                    name="dueDate"
                    type="date"
                    required
                    value={actionDate}
                    onChange={(e) => setActionDate(e.target.value)}
                  />
                </label>
                <button>Create corrective work</button>
              </form>
            )
          )}
          {canApprove && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                if (
                  await save(current, {
                    status: "Reviewed",
                    reviews: [
                      ...(current.reviews || []),
                      { ...f, at: new Date().toISOString() },
                    ],
                  })
                )
                  setMessage("Supervisor review recorded.");
              }}
            >
              <h3>Supervisor review</h3>
              <label>
                Reviewing supervisor
                <select name="personId" required>
                  <option value="">Select supervisor</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Review findings
                <textarea name="notes" required />
              </label>
              <button>Record safety review</button>
            </form>
          )}
          {(current.reviews || []).map((r, i) => (
            <p key={i}>
              {r.at} · {people.find((p) => p.id === r.personId)?.title}:{" "}
              {r.notes}
            </p>
          ))}
          {current.evidence?.data && (
            <a href={current.evidence.data} download={current.evidence.name}>
              Download browser-local evidence
            </a>
          )}
          <details>
            <summary>Related safety training</summary>
            {records
              .filter(
                (r) =>
                  r.orgId === org.id &&
                  moduleInfo(r.module).type === "training" &&
                  /safety|risk|inspection/i.test(
                    r.qualification || r.title || "",
                  ),
              )
              .map((r) => (
                <p key={r.id}>
                  <button
                    onClick={() => onNavigate(r.module, { recordId: r.id })}
                  >
                    {r.qualification || r.title}
                  </button>{" "}
                  · {people.find((p) => p.id === r.personId)?.title || r.person}{" "}
                  · {r.approval} · {r.expiry || "No expiry recorded"}
                </p>
              ))}
          </details>
          <History entries={current.activity} />
          {message && <p role="status">{message}</p>}
        </Modal>
      )}
    </div>
  );
}
