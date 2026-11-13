import React, { useState } from "react";
import { Empty, Modal, Status } from "./components";
import { moduleInfo, isTaskModule } from "./customerModules";
import {
  approvalType,
  approvalToken,
  requesterId,
  automationTemplates,
} from "./administrationRules";
const openRecord = (r, navigate) =>
  navigate(isTaskModule(r.module) ? "Tasks & projects" : r.module, {
    recordId: r.id,
  });
export function ApprovalsPage({
  org,
  records,
  actorId,
  canApprove,
  canEdit,
  onUpdate,
  onNavigate,
}) {
  const [filter, setFilter] = useState("Pending"),
    [selected, setSelected] = useState(null),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [correction, setCorrection] = useState(false);
  const people = records.filter((r) => moduleInfo(r.module).type === "people"),
    person = (id) => people.find((p) => p.id === id)?.title || "Not recorded";
  const requests = records.filter(
    (r) =>
      approvalType(r) ||
      r.approvalHistory?.length ||
      r.approvalNeedsChanges ||
      r.correctionRequest ||
      ["Approved", "Rejected"].includes(r.approval) ||
      r.review === "Approved" ||
      r.documentStatus === "Approved",
  );
  const current = requests.find((r) => r.id === selected);
  const submit = async (decision) => {
    if (!current || busy || !reason.trim()) {
      setMessage("Enter a reason for your decision.");
      return;
    }
    if (
      !actorId ||
      people.find((p) => p.id === actorId)?.employmentStatus !== "Active"
    ) {
      setMessage("Choose an active staff member using Working as.");
      return;
    }
    if (current.approverId && current.approverId !== actorId) {
      setMessage("This request is assigned to another approver.");
      return;
    }
    if (
      org.workspaceConfig?.disallowSelfApproval !== false &&
      (requesterId(current) === actorId ||
        [
          current.personId,
          current.ownerId,
          current.engineerId,
          current.inspectorId,
        ].includes(actorId) ||
        [current.person, current.owner, current.inspector].includes(
          person(actorId),
        ) ||
        (!requesterId(current) && current.person === person(actorId)))
    ) {
      setMessage("Company rules prevent self-approval.");
      return;
    }
    setBusy(true);
    const ok = await onUpdate(org.id, current.id, {
      _approval: {
        actorId,
        token: approvalToken(current),
        decision,
        comment: reason,
      },
    });
    setBusy(false);
    if (ok) {
      setMessage("Decision saved to the underlying record.");
      setReason("");
    }
  };
  const items = requests.filter((r) =>
    filter === "Pending"
      ? Boolean(approvalType(r))
      : filter === "Assigned to me"
        ? approvalType(r) && r.approverId === actorId
        : filter === "Urgent"
          ? approvalType(r) &&
            ["Urgent", "High", "Critical"].includes(r.priority || r.severity)
          : filter === "Changes requested"
            ? r.approvalNeedsChanges ||
              r.correctionRequest?.status === "Changes requested"
            : r.approvalHistory?.some((h) => h.decision === filter) ||
              (filter === "Approve" &&
                (r.approval === "Approved" ||
                  r.review === "Approved" ||
                  r.documentStatus === "Approved")) ||
              (filter === "Reject" && r.approval === "Rejected"),
  );
  return (
    <div className="admin-workspace">
      <div className="ops-banner">
        <div>
          <span className="eyebrow">DECISIONS & REVIEW</span>
          <h2>Approval inbox</h2>
          <p>Decisions update the original request and retain their history.</p>
        </div>
        {canEdit && (
          <button onClick={() => setCorrection(true)}>
            Request timesheet correction
          </button>
        )}
      </div>
      <div className="admin-tabs">
        {[
          "Pending",
          "Assigned to me",
          "Urgent",
          "Approve",
          "Reject",
          "Changes requested",
        ].map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === "Approve" ? "Approved" : f === "Reject" ? "Rejected" : f}
          </button>
        ))}
      </div>
      <div className="approval-queue">
        {items.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setSelected(r.id);
              setMessage("");
              setReason("");
            }}
          >
            <span>
              <small>
                {approvalType(r) || "Decision history"} · {r.module}
              </small>
              <strong>{r.title}</strong>
              <small>
                Requested by {person(requesterId(r))} · Approver{" "}
                {r.approverId ? person(r.approverId) : "Unassigned"}
              </small>
            </span>
            <Status>
              {approvalType(r)
                ? "Pending"
                : r.approval || r.review || r.documentStatus}
            </Status>
          </button>
        ))}
        {!items.length && <Empty>No requests in this view.</Empty>}
      </div>
      {current && (
        <Modal title="Approval decision" onClose={() => setSelected(null)}>
          <h3>{current.title}</h3>
          <p>
            {current.detail ||
              current.description ||
              "Review the linked record before deciding."}
          </p>
          <p>
            Requester: {person(requesterId(current))} · Submitted:{" "}
            {current.submittedAt ||
              current.createdAt ||
              current.correctionRequest?.at ||
              "Legacy date not recorded"}
          </p>
          {current.correctionRequest && (
            <p>
              Proposed time: {current.correctionRequest.startTime} —{" "}
              {current.correctionRequest.endTime} ·{" "}
              {current.correctionRequest.breakMinutes} break minutes ·{" "}
              {current.correctionRequest.reason}
            </p>
          )}
          <button onClick={() => openRecord(current, onNavigate)}>
            Open original record
          </button>
          {canApprove && approvalType(current) && (
            <>
              <label>
                Assigned approver
                <select
                  aria-label="Assigned approver"
                  value={current.approverId || ""}
                  onChange={(e) =>
                    onUpdate(org.id, current.id, { approverId: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {people
                    .filter((p) => p.employmentStatus === "Active")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Decision reason
                <textarea
                  aria-label="Decision reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1000}
                />
              </label>
              <div className="quick-actions">
                {["Approve", "Reject", "Request changes"].map((d) => (
                  <button
                    disabled={busy || !actorId}
                    key={d}
                    onClick={() => submit(d)}
                  >
                    {d} request
                  </button>
                ))}
              </div>
            </>
          )}
          {!canApprove && (
            <p>You can view requests; the selected role cannot approve them.</p>
          )}
          {message && <p role="status">{message}</p>}
          {!actorId && canApprove && (
            <p>
              Select an existing staff profile using Working as before deciding.
            </p>
          )}
          {canEdit &&
            current.approvalNeedsChanges &&
            ["leave", "timesheets", "documents", "projects"].includes(
              moduleInfo(current.module).type,
            ) &&
            (canApprove || requesterId(current) === actorId) && (
              <button
                onClick={async () => {
                  if (
                    await onUpdate(org.id, current.id, {
                      approval: "Pending",
                      approvalNeedsChanges: false,
                    })
                  )
                    setMessage("Request resubmitted for review.");
                }}
              >
                Resubmit request
              </button>
            )}
          <h3>Decision history</h3>
          {(current.approvalHistory || []).map((h) => (
            <p className="task-note" key={h.id}>
              {h.actorName} · {h.decision} ·{" "}
              {new Date(h.at).toLocaleString("en-GB")}
              <br />
              {h.comment}
            </p>
          ))}
          <h3>Comments</h3>
          {(current.approvalComments || []).map((c) => (
            <p className="task-note" key={c.id}>
              {person(c.personId)} · {c.text}
            </p>
          ))}
          {canEdit && actorId && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  text = String(new FormData(form).get("text") || "").trim();
                if (
                  text &&
                  (await onUpdate(org.id, current.id, {
                    approvalComments: [
                      ...(current.approvalComments || []),
                      {
                        id: crypto.randomUUID(),
                        personId: actorId,
                        at: new Date().toISOString(),
                        text,
                      },
                    ],
                  }))
                )
                  form.reset();
              }}
            >
              <label>
                Approval comment
                <textarea name="text" required maxLength={1000} />
              </label>
              <button>Add approval comment</button>
            </form>
          )}
        </Modal>
      )}
      {correction && (
        <Modal
          title="Timesheet correction request"
          onClose={() => setCorrection(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)),
                row = records.find((r) => r.id === f.recordId);
              if (
                !row ||
                !actorId ||
                !f.startTime ||
                !f.endTime ||
                f.endTime <= f.startTime ||
                Number(f.breakMinutes) < 0 ||
                Number(f.breakMinutes) >
                  (Date.parse(f.endTime) - Date.parse(f.startTime)) / 60000
              ) {
                setMessage(
                  "Choose a session, staff profile and valid times and breaks.",
                );
                return;
              }
              if (
                await onUpdate(org.id, row.id, {
                  correctionRequest: {
                    status: "Pending",
                    at: new Date().toISOString(),
                    requesterId: actorId,
                    startTime: f.startTime,
                    endTime: f.endTime,
                    breakMinutes: Number(f.breakMinutes),
                    reason: f.reason,
                  },
                })
              ) {
                setCorrection(false);
                setMessage(
                  "Correction submitted; original hours are unchanged until approval.",
                );
              }
            }}
          >
            <label>
              Recorded session
              <select name="recordId" required>
                <option value="">Choose session</option>
                {records
                  .filter((r) => moduleInfo(r.module).type === "timesheets")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} · {r.person}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Corrected start
              <input name="startTime" type="datetime-local" required />
            </label>
            <label>
              Corrected end
              <input name="endTime" type="datetime-local" required />
            </label>
            <label>
              Break minutes
              <input
                name="breakMinutes"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
            </label>
            <label>
              Correction reason
              <textarea name="reason" required maxLength={500} />
            </label>
            {message && <p role="alert">{message}</p>}
            <button>Submit correction request</button>
          </form>
        </Modal>
      )}
      <p className="module-disclaimer">
        Fictional approval authority. Self-approval and assigned-approver rules
        are checked against current demo records; these are not production
        security controls.
      </p>
    </div>
  );
}
export function AutomationsPage({
  org,
  records,
  onConfigure,
  onUpdate,
  onNavigate,
  canManage,
}) {
  const rules = org.workspaceConfig?.automationRules || [],
    runs = org.workspaceConfig?.automationRuns || [];
  const [creating, setCreating] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [trigger, setTrigger] = useState(automationTemplates[0].trigger);
  const saveRules = (automationRules) =>
    onConfigure(
      { workspaceConfig: { automationRules } },
      "Updated automation configuration",
    );
  return (
    <div className="admin-workspace">
      <div className="ops-banner">
        <div>
          <span className="eyebrow">ACTIVE-SESSION AUTOMATIONS</span>
          <h2>Workflow automations</h2>
          <p>
            Supported rules execute on record saves while this demo is open.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setCreating(true)}>Create automation</button>
        )}
      </div>
      <div className="automation-list">
        {rules.map((r) => (
          <article key={r.id}>
            <h3>{r.name}</h3>
            <p>
              When {r.trigger.toLowerCase()} → {r.action.toLowerCase()}
            </p>
            <p>Condition: {r.priority || "Any priority"}</p>
            <label className="task-check">
              <input
                type="checkbox"
                aria-label={"Enable " + r.name}
                disabled={!canManage}
                checked={r.enabled}
                onChange={(e) =>
                  saveRules(
                    rules.map((rule) =>
                      rule.id === r.id
                        ? { ...rule, enabled: e.target.checked }
                        : rule,
                    ),
                  )
                }
              />
              Enabled
            </label>
          </article>
        ))}
        {!rules.length && (
          <Empty>
            No active-session rules configured. Create a rule from a supported
            template.
          </Empty>
        )}
      </div>
      {canManage && (
        <button
          disabled={busy || !rules.some((r) => r.enabled)}
          onClick={async () => {
            setBusy(true);
            for (const r of records.filter((r) =>
              ["inspections", "maintenance", "projects"].includes(
                moduleInfo(r.module).type,
              ),
            ))
              await onUpdate(org.id, r.id, {
                automationRequestedAt: new Date().toISOString(),
              });
            setBusy(false);
            setMessage(
              "Current records evaluated. Review successful and failed executions below.",
            );
          }}
        >
          Evaluate current records
        </button>
      )}
      {message && <p role="status">{message}</p>}
      <h3>Execution history</h3>
      {[...runs].reverse().map((h) => (
        <article className="task-note" key={h.id}>
          <strong>{h.status}</strong> · {new Date(h.at).toLocaleString("en-GB")}{" "}
          · {rules.find((r) => r.id === h.ruleId)?.name || "Previous rule"}
          <p>{h.detail}</p>
          {h.sourceId && records.find((r) => r.id === h.sourceId) && (
            <button
              onClick={() =>
                openRecord(
                  records.find((r) => r.id === h.sourceId),
                  onNavigate,
                )
              }
            >
              Open source record
            </button>
          )}
          {h.targetId && records.find((r) => r.id === h.targetId) && (
            <button
              onClick={() =>
                openRecord(
                  records.find((r) => r.id === h.targetId),
                  onNavigate,
                )
              }
            >
              Open generated record
            </button>
          )}
        </article>
      ))}
      {!runs.length && <Empty>No rule executions yet.</Empty>}
      {creating && (
        <Modal title="Automation builder" onClose={() => setCreating(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)),
                template = automationTemplates.find(
                  (t) => t.trigger === trigger,
                );
              if (
                await saveRules([
                  ...rules,
                  {
                    id: crypto.randomUUID(),
                    name: f.name.trim(),
                    trigger,
                    action: template.action,
                    priority: f.priority,
                    enabled: true,
                  },
                ])
              )
                setCreating(false);
            }}
          >
            <label>
              Automation name
              <input name="name" maxLength={100} required />
            </label>
            <label>
              Trigger
              <select
                aria-label="Automation trigger"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
              >
                {automationTemplates.map((t) => (
                  <option key={t.trigger}>{t.trigger}</option>
                ))}
              </select>
            </label>
            <label>
              Action
              <select
                aria-label="Automation action"
                value={
                  automationTemplates.find((t) => t.trigger === trigger)?.action
                }
                readOnly
                onChange={() => {}}
              >
                <option>
                  {
                    automationTemplates.find((t) => t.trigger === trigger)
                      ?.action
                  }
                </option>
              </select>
            </label>
            <label>
              Priority condition
              <select name="priority">
                <option value="">Any priority</option>
                {["Normal", "High", "Urgent"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <button>Save automation</button>
          </form>
        </Modal>
      )}
      <p className="module-disclaimer">
        One generated action per rule/source record, including repeat
        evaluations. Generated records do not recursively execute more rules. No
        timer, email or closed-browser job runs. Qualification and stock
        reminders remain in Notifications.
      </p>
    </div>
  );
}
export function ActivityPage({ org, records, onNavigate, canManage }) {
  const [user, setUser] = useState(""),
    [module, setModule] = useState(""),
    [action, setAction] = useState(""),
    [date, setDate] = useState("");
  const entries = [
    ...records.flatMap((r) =>
      (r.activity || []).map((a) => ({ ...a, record: r, module: r.module })),
    ),
    ...(canManage
      ? (org.workspaceConfig?.activity || []).map((a) => ({
          ...a,
          module: "Company settings",
        }))
      : []),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const visible = entries.filter(
    (a) =>
      (!user || a.actorName === user) &&
      (!module || a.module === module) &&
      (!action || a.action === action) &&
      (!date || a.at.slice(0, 10) === date),
  );
  const select = (label, value, setter, values) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => setter(e.target.value)}
      >
        <option value="">All</option>
        {[...new Set(values)].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="admin-workspace">
      <div className="ops-banner">
        <div>
          <span className="eyebrow">DEMONSTRATION ACTIVITY</span>
          <h2>Activity history</h2>
          <p>Current-session record and configuration changes.</p>
        </div>
      </div>
      <div className="admin-filters">
        {select(
          "Activity user",
          user,
          setUser,
          entries.map((a) => a.actorName),
        )}
        {select(
          "Activity module",
          module,
          setModule,
          entries.map((a) => a.module),
        )}
        {select(
          "Activity action",
          action,
          setAction,
          entries.map((a) => a.action),
        )}
        <label>
          Activity date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="activity-timeline">
        {visible.map((a) => (
          <article key={a.id}>
            <small>
              {new Date(a.at).toLocaleString("en-GB")} · {a.actorName} ·{" "}
              {a.role}
            </small>
            <h3>
              {a.action} · {a.record?.title || a.module}
            </h3>
            <p>{a.details}</p>
            {a.record && (
              <button onClick={() => openRecord(a.record, onNavigate)}>
                Open affected record
              </button>
            )}
          </article>
        ))}
        {!visible.length && (
          <Empty>
            No activity matches these filters. Create or update a record to
            populate this timeline.
          </Empty>
        )}
      </div>
      <p className="module-disclaimer">
        Browser-memory history is editable by visitors and resets with the demo.
        It is not tamper-proof or a legal audit trail.
      </p>
    </div>
  );
}
