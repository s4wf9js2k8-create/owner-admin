import React, { useState } from "react";
import { Panel, Status } from "../components";
import {
  illustrativeAmount,
  reorder,
  ownerPageAllowed,
  ownerCanManage,
} from "./rules";
const widgets = [
  "Customer status",
  "Support priorities",
  "Sales follow-ups",
  "Package overview",
  "Module adoption",
  "Platform health",
  "Recent activity",
];
export default function BusinessDashboard({ controller, data }) {
  const {
      orgs,
      tickets,
      plans,
      logs,
      records,
      navigate,
      preview,
      flags,
      ownerRole,
    } = controller,
    [editing, setEditing] = useState(false);
  const layout = flags.ownerDashboard || widgets,
    setLayout = (next) =>
      controller.setFlags({ ...flags, ownerDashboard: next });
  const jump = (page) => ownerPageAllowed(ownerRole, page) && navigate(page);
  return (
    <div className="owner-business-dashboard">
      <div className="ops-banner">
        <div>
          <span className="eyebrow">CHANNEL SYSTEMS</span>
          <h2>{flags.business?.name || "Business control centre"}</h2>
          <p>
            {flags.business?.tagline ||
              "Bespoke Business Software & Management Solutions"}
          </p>
        </div>
        <button
          disabled={!ownerCanManage(ownerRole)}
          onClick={() => setEditing(!editing)}
        >
          Customise business dashboard
        </button>
      </div>
      <div className="owner-quick-actions">
        {[
          ["Organisations", "Companies"],
          ["Onboarding", "Begin onboarding"],
          ["Support", "Create support ticket"],
          ["Sales Leads", "Add sales lead"],
          ["Subscriptions", "Configure package"],
          ["Modules", "Module catalogue"],
          ["Announcements", "Create customer announcement"],
        ]
          .filter(([p]) => ownerPageAllowed(ownerRole, p))
          .map(([p, l]) => (
            <button key={p} onClick={() => jump(p)}>
              {l}
            </button>
          ))}
        {flags.customerPreview && (
          <button
            onClick={() =>
              preview(orgs.find((o) => o.status !== "Archived")?.id)
            }
          >
            Explore customer workspace
          </button>
        )}
      </div>
      {editing && (
        <div className="owner-widget-picker">
          {widgets.map((w) => (
            <label className="task-check" key={w}>
              <input
                type="checkbox"
                checked={layout.includes(w)}
                onChange={(e) =>
                  setLayout(
                    e.target.checked
                      ? [...layout, w]
                      : layout.filter((x) => x !== w),
                  )
                }
              />
              {w}
            </label>
          ))}
          <button onClick={() => setLayout(widgets)}>
            Reset business layout
          </button>
        </div>
      )}
      <div className="owner-control-grid">
        {layout.map((w) => (
          <Panel key={w} title={w}>
            {editing && (
              <div>
                <button
                  aria-label={"Move " + w + " up"}
                  disabled={layout.indexOf(w) === 0}
                  onClick={() => setLayout(reorder(layout, w, -1))}
                >
                  ↑
                </button>
                <button
                  aria-label={"Move " + w + " down"}
                  disabled={layout.indexOf(w) === layout.length - 1}
                  onClick={() => setLayout(reorder(layout, w, 1))}
                >
                  ↓
                </button>
              </div>
            )}
            {w === "Customer status" && (
              <>
                <div className="owner-status-strip">
                  {["Trial", "Active", "Suspended", "Archived"].map((s) => (
                    <span key={s}>
                      <Status>{s}</Status>{" "}
                      {orgs.filter((o) => o.status === s).length}
                    </span>
                  ))}
                </div>
                {orgs
                  .filter((o) => o.status === "Trial")
                  .map((o) => (
                    <button
                      className="owner-row"
                      key={o.id}
                      onClick={() => jump("Organisations")}
                    >
                      {o.name} · Onboarding{" "}
                      {o.onboardingComplete ? "configured" : "to review"}
                    </button>
                  ))}
              </>
            )}
            {w === "Support priorities" && (
              <>
                {tickets
                  .filter((t) => !["Closed", "Resolved"].includes(t.status))
                  .sort(
                    (a, b) =>
                      ["Urgent", "High", "Normal", "Low"].indexOf(a.priority) -
                      ["Urgent", "High", "Normal", "Low"].indexOf(b.priority),
                  )
                  .slice(0, 5)
                  .map((t) => (
                    <button
                      className="owner-row"
                      key={t.id}
                      onClick={() => {
                        controller.setTicketId(t.id);
                        jump("Support");
                      }}
                    >
                      <strong>{t.subject}</strong>
                      <small>
                        {orgs.find((o) => o.id === t.orgId)?.name} ·{" "}
                        {t.priority} · {t.status}
                      </small>
                    </button>
                  ))}
                {!tickets.some(
                  (t) => !["Closed", "Resolved"].includes(t.status),
                ) && <p>No unresolved tickets.</p>}
              </>
            )}
            {w === "Sales follow-ups" && (
              <>
                {data.leads
                  .filter((l) => !["Won", "Lost"].includes(l.stage))
                  .map((l) => (
                    <button
                      className="owner-row"
                      key={l.id}
                      onClick={() => jump("Sales Leads")}
                    >
                      {l.name} · {l.stage}
                      <small>Follow-up {l.followUp || "not recorded"}</small>
                    </button>
                  ))}
              </>
            )}
            {w === "Package overview" && (
              <>
                {plans.map((p) => (
                  <p key={p.name}>
                    <strong>{p.name}</strong> ·{" "}
                    {orgs.filter((o) => o.plan === p.name).length} companies
                  </p>
                ))}
                <p>
                  Active illustrative recurring amounts: £
                  {orgs
                    .filter((o) => o.status === "Active")
                    .reduce(
                      (n, o) =>
                        n +
                        (illustrativeAmount(
                          { ...o, cycle: "Monthly" },
                          plans,
                        ) || 0),
                      0,
                    )
                    .toFixed(2)}{" "}
                  / month equivalent at configured monthly rates. No payments
                  collected.
                </p>
              </>
            )}
            {w === "Module adoption" &&
              [...new Set(orgs.flatMap((o) => o.modules))]
                .map((m) => ({
                  name: m,
                  count: orgs.filter((o) => o.modules.includes(m)).length,
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
                .map((m) => (
                  <div className="owner-adoption" key={m.name}>
                    <span>{m.name}</span>
                    <progress value={m.count} max={orgs.length || 1} />
                    <strong>{m.count}</strong>
                  </div>
                ))}
            {w === "Platform health" && (
              <>
                <p>
                  <Status>Not connected</Status> API / database / backup
                  monitoring
                </p>
                <p>
                  The static frontend is running. Host resource readings and
                  backup operations are unavailable.
                </p>
                {ownerPageAllowed(ownerRole, "Infrastructure") && (
                  <button onClick={() => jump("Infrastructure")}>
                    Inspect platform boundaries
                  </button>
                )}
                <p>
                  {records.length} fictional records currently available across
                  companies.
                </p>
              </>
            )}
            {w === "Recent activity" && (
              <>
                {logs.slice(0, 6).map((l) => (
                  <p key={l.id}>
                    <small>
                      {l.time} · {l.actorName || "Fictional operator"}
                    </small>
                    <br />
                    {l.event}
                  </p>
                ))}
                {!logs.length && <p>No owner actions recorded yet.</p>}
                <button onClick={() => jump("Activity Logs")}>
                  Open activity centre
                </button>
              </>
            )}
          </Panel>
        ))}
      </div>
      <p className="module-disclaimer">
        Company records and configured prices are real demo state, not
        production telemetry or revenue.
      </p>
    </div>
  );
}
