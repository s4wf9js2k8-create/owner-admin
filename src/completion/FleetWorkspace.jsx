import AssignmentPolicy from "../reconciliation/AssignmentPolicy";
import React, { useEffect, useState } from "react";
import { Modal, Empty, Status } from "../components";
import { moduleInfo } from "../customerModules";
import { eligibleStaff } from "../staffEligibility";
import { LinkedRecordFiles } from "../RecordFiles";
import { vehicleQuestions } from "./rules";
import { EvidencePicker, History, TabBar } from "./Shared";
const today = () => new Date().toISOString().slice(0, 10);
export default function FleetWorkspace({
  org,
  module,
  records,
  historyRecords = records,
  onAdd,
  onUpdate,
  onNavigate,
  focusId,
  canCreate = true,
  canEdit = true,
}) {
  const rows = records.filter((r) => r.orgId === org.id && r.module === module),
    people = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "people",
    );
  const [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [tab, setTab] = useState("Overview"),
    [message, setMessage] = useState(""),
    [search, setSearch] = useState(""),
    [answers, setAnswers] = useState({}),
    [driverId, setDriverId] = useState(""),
    [date, setDate] = useState(today()),
    [evidence, setEvidence] = useState(null),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false);
  const current = rows.find((r) => r.id === selected),
    eligibility = eligibleStaff(records, org.id, {
      kind: "fleet",
      date,
      requiredQualification: current?.requiredQualification,
      department: current?.requiredDepartment,
    }),
    engineers = eligibleStaff(records, org.id, { kind: "maintenance", date });
  useEffect(() => {
    if (focusId) setSelected(focusId);
  }, [focusId]);
  const open = (r) => {
    setSelected(r.id);
    setTab("Overview");
    setAnswers({});
    setDriverId("");
    setMessage("");
    setRequestId(crypto.randomUUID());
  };
  const command = async (value) => {
    if (busy) return;
    setBusy(true);
    const ok = await onUpdate(org.id, current.id, { _workflow: value });
    setBusy(false);
    if (ok) setMessage("Vehicle record updated.");
    return ok;
  };
  const jobs = current
    ? historyRecords.filter(
        (r) => r.orgId === org.id && r.sourceFleetId === current.id,
      )
    : [];
  return (
    <div className="completion-workspace fleet-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">FLEET OPERATIONS</span>
          <h2>Fleet & vehicles</h2>
          <p>
            Daily checks, qualified drivers, defects and an accountable service
            history.
          </p>
        </div>
        {canCreate && (
          <button className="action-primary" onClick={() => setCreating(true)}>
            Register vehicle
          </button>
        )}
      </div>
      <label>
        Find vehicle
        <input value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <div className="fleet-garage">
        {rows
          .filter((r) =>
            [r.title, r.registration, r.location]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((r) => (
            <article className="vehicle-card" key={r.id}>
              <header>
                <span className="eyebrow">{r.vehicleType || "Vehicle"}</span>
                <h3>{r.registration || r.title}</h3>
                <p>{r.title}</p>
                <Status>{r.condition || "Condition to confirm"}</Status>
              </header>
              <dl className="completion-properties">
                <dt>Mileage</dt>
                <dd>{Number(r.mileage || 0).toLocaleString("en-GB")}</dd>
                <dt>Service</dt>
                <dd>
                  {r.serviceDue || "Not recorded"}
                  {r.serviceDue && r.serviceDue < today() ? " · Overdue" : ""}
                </dd>
                <dt>MOT</dt>
                <dd>{r.motDue || "Not applicable / unrecorded"}</dd>
                <dt>Insurance</dt>
                <dd>{r.insuranceDue || "Not recorded"}</dd>
                <dt>Open defects</dt>
                <dd>
                  {
                    (r.defects || []).filter(
                      (d) =>
                        !d.resolved &&
                        !records.some(
                          (j) =>
                            j.id === d.workOrderId && j.status === "Complete",
                        ),
                    ).length
                  }
                </dd>
              </dl>
              <button onClick={() => open(r)}>Open vehicle checks</button>
            </article>
          ))}
      </div>
      {!rows.length && (
        <Empty>
          No vehicles registered. Register a vehicle to start daily checks and
          servicing.
        </Empty>
      )}
      {creating && (
        <Modal title="Register vehicle" onClose={() => setCreating(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const saved = await onAdd({
                ...f,
                orgId: org.id,
                module,
                recordType: "vehicle",
                mileage: Number(f.mileage),
                status: "Active",
                condition: "Good",
                checks: [],
                defects: [],
                checkQuestions: vehicleQuestions,
              });
              if (saved) {
                setCreating(false);
                open(saved);
              }
            }}
          >
            <label>
              Title
              <input name="title" required maxLength={100} />
            </label>
            <label>
              Vehicle reference
              <input name="registration" required maxLength={30} />
            </label>
            <label>
              Vehicle type
              <select name="vehicleType">
                <option>Van</option>
                <option>Car</option>
                <option>Minibus</option>
                <option>Specialist vehicle</option>
              </select>
            </label>
            <label>
              Mileage
              <input
                name="mileage"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                required
              />
            </label>
            <label>
              Depot
              <select name="location">
                {(
                  org.workspaceConfig?.locations || [
                    "Operations yard",
                    "Workshop",
                  ]
                ).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            {[
              ["serviceDue", "Service due"],
              ["motDue", "MOT due"],
              ["insuranceDue", "Insurance expiry"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input type="date" name={key} />
              </label>
            ))}
            <label>
              Linked asset
              <select name="assetRefId">
                <option value="">No existing asset</option>
                {records
                  .filter((r) => moduleInfo(r.module).type === "assets")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
              </select>
            </label>
            <button>Create sample entry</button>
          </form>
        </Modal>
      )}
      {current && (
        <Modal title="Vehicle operations" onClose={() => setSelected("")}>
          <h2>
            {current.registration} · {current.title}
          </h2>
          <TabBar
            current={tab}
            setCurrent={setTab}
            tabs={[
              "Overview",
              "Drivers",
              "Daily checks",
              "Defects",
              "Service history",
              "Mileage",
              "Documents",
              "History",
            ]}
          />
          {message && <p role="status">{message}</p>}
          {tab === "Overview" && (
            <>
              <p>
                {current.vehicleType || "Vehicle"} · {current.location}
              </p>
              <p>
                Mileage: {Number(current.mileage || 0).toLocaleString("en-GB")}
              </p>
              {canEdit && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await onUpdate(
                        org.id,
                        current.id,
                        Object.fromEntries(new FormData(e.currentTarget)),
                      )
                    )
                      setMessage("Vehicle dates and condition saved.");
                  }}
                >
                  <div className="form-pair">
                    {[
                      ["serviceDue", "Next service"],
                      ["motDue", "MOT expiry"],
                      ["insuranceDue", "Insurance expiry"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="date"
                          name={key}
                          defaultValue={current[key] || ""}
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Condition
                    <select
                      name="condition"
                      defaultValue={current.condition || "Good"}
                    >
                      {[
                        "Good",
                        "Monitor",
                        "Needs attention",
                        "Out of service",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <button>Save vehicle details</button>
                </form>
              )}
              <button onClick={() => setTab("Daily checks")}>
                Start daily vehicle check
              </button>
              {current.assetRefId && (
                <button
                  onClick={() => {
                    const a = records.find((a) => a.id === current.assetRefId);
                    if (a) onNavigate(a.module, { recordId: a.id });
                  }}
                >
                  Open vehicle asset
                </button>
              )}
            </>
          )}
          {tab === "Drivers" && (
            <>
              <h3>Eligible drivers</h3>
              <label>
                Assignment date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Responsible driver
                <select
                  aria-label="Responsible driver"
                  disabled={!canEdit}
                  value={current.driverId || ""}
                  onChange={(e) =>
                    onUpdate(org.id, current.id, {
                      driverId: e.target.value,
                      personId: e.target.value,
                      owner: "",
                    })
                  }
                >
                  <option value="">Choose qualified available driver</option>
                  {eligibility.eligible.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <ul>
                {eligibility.excluded.map((p) => (
                  <li key={p.id}>
                    {p.title}: {p.assessment.reasons.join("; ")}
                  </li>
                ))}
              </ul>
            </>
          )}
          <AssignmentPolicy
            key={current.id}
            record={current}
            records={records}
            onUpdate={onUpdate}
            canEdit={canEdit}
          />
          {tab === "Daily checks" && (
            <>
              {canEdit && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    if (
                      await command({
                        kind: "vehicleCheck",
                        requestId,
                        driverId,
                        date,
                        mileage: f.mileage,
                        answers,
                        findings: f.findings,
                        evidence,
                        createWork: f.createWork === "on",
                      })
                    ) {
                      setAnswers({});
                      setEvidence(null);
                      setRequestId(crypto.randomUUID());
                    }
                  }}
                >
                  <div className="form-pair">
                    <label>
                      Check date
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Odometer
                      <input
                        name="mileage"
                        type="number"
                        min={current.mileage || 0}
                        step="1"
                        defaultValue={current.mileage || 0}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Check driver
                    <select
                      aria-label="Check driver"
                      required
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                    >
                      <option value="">Choose eligible driver</option>
                      {eligibility.eligible.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!eligibility.eligible.length && (
                    <p>
                      No qualified available driver. Update approved driving
                      training before recording a check.
                    </p>
                  )}
                  <fieldset>
                    <legend>Walk-round checks</legend>
                    {(current.checkQuestions || vehicleQuestions).map((q) => (
                      <label className="completion-check-row" key={q}>
                        {q}
                        <select
                          aria-label={q + " check"}
                          required
                          value={answers[q] || ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [q]: e.target.value })
                          }
                        >
                          <option value="">Choose result</option>
                          <option>Pass</option>
                          <option>Fail</option>
                        </select>
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    Findings
                    <textarea
                      name="findings"
                      required={Object.values(answers).includes("Fail")}
                      maxLength={1500}
                    />
                  </label>
                  <EvidencePicker value={evidence} onChange={setEvidence} />
                  <label className="task-check">
                    <input
                      type="checkbox"
                      name="createWork"
                      defaultChecked={org.modules.some(
                        (m) => moduleInfo(m).type === "maintenance",
                      )}
                    />
                    Create linked maintenance for a failed check
                  </label>
                  <button disabled={busy}>Save daily vehicle check</button>
                </form>
              )}
              <details>
                <summary>Configure additional check items</summary>
                {canEdit && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const items = String(
                        new FormData(e.currentTarget).get("items"),
                      )
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (
                        items.length &&
                        (await onUpdate(org.id, current.id, {
                          checkQuestions: [
                            ...new Set([...vehicleQuestions, ...items]),
                          ],
                        }))
                      )
                        setMessage(
                          "Check template updated. Earlier check snapshots are retained.",
                        );
                    }}
                  >
                    <label>
                      Additional checks (one per line)
                      <textarea name="items" />
                    </label>
                    <button>Save check template</button>
                  </form>
                )}
              </details>
              <h3>Check history</h3>
              {(current.checks || []).map((c) => (
                <article className="completion-entry" key={c.id || c.date}>
                  <strong>
                    {c.date || c.at} · {c.result}
                  </strong>
                  <p>
                    {people.find((p) => p.id === c.driverId)?.title ||
                      "Legacy driver not recorded"}{" "}
                    · {c.mileage} miles
                  </p>
                  <p>{c.comment}</p>
                  {Object.entries(c.answers || {}).map(([q, a]) => (
                    <small key={q}>
                      {q}: {a} ·{" "}
                    </small>
                  ))}
                  {c.evidence?.data && (
                    <a href={c.evidence.data} download={c.evidence.name}>
                      Download local evidence
                    </a>
                  )}
                </article>
              ))}
            </>
          )}
          {tab === "Defects" && (
            <>
              <h3>Defect register</h3>
              {(current.defects || []).map((d, i) => {
                const job = jobs.find((j) => j.id === d.workOrderId);
                return (
                  <article className="completion-entry" key={d.id || i}>
                    <strong>{d.text}</strong>
                    <p>
                      {d.at} ·{" "}
                      {d.resolved || job?.status === "Complete"
                        ? "Resolved"
                        : "Open"}
                    </p>
                    {job && (
                      <button
                        onClick={() =>
                          onNavigate(job.module, { recordId: job.id })
                        }
                      >
                        Open corrective work order
                      </button>
                    )}
                    {canEdit && !job && !d.resolved && (
                      <button
                        onClick={() =>
                          onUpdate(org.id, current.id, {
                            defects: current.defects.map((x, j) =>
                              i === j
                                ? {
                                    ...x,
                                    resolved: true,
                                    resolvedAt: new Date().toISOString(),
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        Resolve defect
                      </button>
                    )}
                  </article>
                );
              })}
              {!current.defects?.length && (
                <Empty>
                  No reported defects. Daily check failures appear here
                  automatically.
                </Empty>
              )}
            </>
          )}
          {tab === "Service history" && (
            <>
              {canEdit && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    await command({ kind: "vehicleService", ...f });
                  }}
                >
                  <h3>Record completed service</h3>
                  <label>
                    Service date
                    <input
                      type="date"
                      name="date"
                      defaultValue={today()}
                      required
                    />
                  </label>
                  <label>
                    Servicing engineer
                    <select name="personId" required>
                      <option value="">Choose qualified engineer</option>
                      {engineers.eligible.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mileage
                    <input
                      name="mileage"
                      type="number"
                      min={current.mileage || 0}
                      defaultValue={current.mileage || 0}
                      required
                    />
                  </label>
                  <label>
                    Next service due
                    <input type="date" name="nextDue" required />
                  </label>
                  <label>
                    Service details
                    <textarea name="notes" required />
                  </label>
                  <button>Record service</button>
                </form>
              )}
              <History entries={current.serviceHistory || []} />
              {jobs.map((j) => (
                <button
                  className="schedule-linked"
                  key={j.id}
                  onClick={() => onNavigate(j.module, { recordId: j.id })}
                >
                  {j.title} · {j.status}
                </button>
              ))}
            </>
          )}
          {tab === "Mileage" && (
            <History
              entries={(current.mileageHistory || []).map((e) => ({
                ...e,
                text:
                  Number(e.mileage).toLocaleString("en-GB") +
                  " miles · " +
                  (people.find((p) => p.id === e.driverId)?.title ||
                    "Recorded"),
              }))}
            />
          )}
          {tab === "Documents" && (
            <LinkedRecordFiles
              record={current}
              records={records}
              onNavigate={onNavigate}
            />
          )}
          {tab === "History" && <History entries={current.activity || []} />}
        </Modal>
      )}
      <p className="module-disclaimer">
        Fictional fleet records. Checks and expiry dates do not certify
        roadworthiness or legal compliance.
      </p>
    </div>
  );
}
