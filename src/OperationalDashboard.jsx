import React, { useState } from "react";
import { Empty, Status } from "./components";
import { moduleInfo, isTaskModule } from "./customerModules";
import { approvalType } from "./administrationRules";
import {
  money,
  balancePence,
  documentKind,
  financialStatus,
} from "./financialRules";
import { firstModuleOfType } from "./customerWorkflows";
const labels = {
  staff: "Staff on site",
  shifts: "Upcoming shifts",
  attention: "Work needing attention",
  work: "My assigned work",
  events: "Upcoming events",
  maintenance: "Maintenance alerts",
  bookings: "Booking totals",
  visitors: "Visitor statistics",
  inventory: "Inventory alerts",
  qualifications: "Qualification expiry",
  financial: "Financial overview",
  approvals: "Pending approvals",
};
const presets = {
  Operations: ["staff", "shifts", "attention", "work"],
  Engineering: ["attention", "staff", "work", "shifts"],
  Community: ["events", "shifts", "staff", "work"],
  Visitor: ["events", "visitors", "staff", "bookings"],
};
export default function OperationalDashboard({
  org,
  records,
  onNavigate,
  onAdd,
  onUpdate,
  prefs,
  setPrefs,
  actor,
  canEdit,
  canCreate,
}) {
  const [custom, setCustom] = useState(false),
    [notice, setNotice] = useState("");
  const day = new Date().toISOString().slice(0, 10),
    now = new Date().toISOString().slice(0, 16);
  const all = records.filter(
    (r) => r.orgId === org.id && org.modules.includes(r.module),
  );
  const type = (r) => moduleInfo(r.module).type;
  const person = all.find((r) => type(r) === "people" && r.title === actor);
  const attendance = firstModuleOfType(org, "timesheets");
  const site = all.filter(
    (r) => type(r) === "timesheets" && r.startTime && !r.endTime,
  );
  const shifts = all
    .filter(
      (r) =>
        type(r) === "schedule" &&
        r.startTime >= now &&
        r.status !== "Cancelled",
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const alerts = all.filter((r) =>
    type(r) === "inventory"
      ? Number(r.quantity) <= Number(r.reorder || 0)
      : type(r) === "inspections"
        ? ["Fail", "Requires attention"].includes(r.result)
        : ["projects", "maintenance"].includes(type(r)) &&
          r.status !== "Complete" &&
          r.dueDate < day,
  );
  const mine = all.filter(
    (r) =>
      (isTaskModule(r.module) || type(r) === "maintenance") &&
      r.status !== "Complete" &&
      ((person && (r.ownerId === person.id || r.engineerId === person.id)) ||
        r.owner === actor),
  );
  const events = all
    .filter(
      (r) =>
        type(r) === "events" &&
        r.recordType !== "booking" &&
        r.startTime >= now,
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const available = (id) =>
    (
      ({
        staff: ["timesheets"],
        shifts: ["schedule"],
        attention: ["projects", "maintenance", "inspections", "inventory"],
        work: ["projects", "maintenance"],
        events: ["events"],
        maintenance: ["maintenance"],
        bookings: ["bookings", "events"],
        visitors: ["visitors"],
        inventory: ["inventory"],
        qualifications: ["training"],
        financial: ["finance"],
        approvals: [
          "leave",
          "timesheets",
          "maintenance",
          "inspections",
          "documents",
          "finance",
        ],
      })[id] || []
    ).some((t) => org.modules.some((m) => moduleInfo(m).type === t));
  const template =
    presets[
      org.sector === "visitor"
        ? "Visitor"
        : org.sector === "engineering"
          ? "Engineering"
          : org.sector === "charity"
            ? "Community"
            : "Operations"
    ].filter(available);
  const widgets = (
    prefs.widgets ||
    presets[
      org.sector === "visitor"
        ? "Visitor"
        : org.sector === "engineering"
          ? "Engineering"
          : org.sector === "charity"
            ? "Community"
            : "Operations"
    ]
  ).filter((id) => labels[id] && available(id));
  const open = (r) =>
    onNavigate(isTaskModule(r.module) ? "Tasks & projects" : r.module, {
      recordId: r.id,
    });
  const move = (id, by) => {
    const next = [...widgets],
      index = next.indexOf(id),
      to = index + by;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setPrefs({ ...prefs, widgets: next });
  };
  const clock = async () => {
    if (!person) {
      setNotice("Choose a staff profile using Working as before clocking in.");
      return;
    }
    const session = site.find(
      (r) => r.personId === person.id || r.person === person.title,
    );
    const ok = session
      ? await onUpdate(org.id, session.id, { endTime: now, status: "Complete" })
      : await onAdd({
          orgId: org.id,
          module: attendance,
          title: person.title + " · Sample session",
          personId: person.id,
          person: person.title,
          startTime: now,
          endTime: "",
          location: person.location || "Main site",
          approval: "Pending",
          status: "In progress",
        });
    if (ok) setNotice(session ? "Clock-out recorded." : "Clock-in recorded.");
  };
  const actions = [
    ["projects", "Create task"],
    ["maintenance", "Raise work order"],
    ["leave", "Request leave"],
    ["inspections", "Start inspection"],
    ["events", "Open bookings"],
  ]
    .map(([kind, label]) => ({ module: firstModuleOfType(org, kind), label }))
    .filter((a) => a.module);
  const rows = {
    staff: site,
    shifts,
    attention: alerts,
    work: mine,
    events,
    maintenance: all.filter(
      (r) => type(r) === "maintenance" && r.status !== "Complete",
    ),
    bookings: all.filter(
      (r) =>
        (type(r) === "bookings" && r.status !== "Cancelled") ||
        (type(r) === "events" &&
          r.recordType === "booking" &&
          ["Confirmed", "Checked in"].includes(r.bookingStatus)),
    ),
    visitors: all.filter((r) => type(r) === "visitors"),
    inventory: all.filter(
      (r) =>
        type(r) === "inventory" && Number(r.quantity) <= Number(r.reorder || 0),
    ),
    qualifications: all.filter(
      (r) =>
        type(r) === "training" &&
        r.expiry &&
        r.expiry <=
          new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    ),
    financial: all.filter(
      (r) =>
        type(r) === "finance" &&
        documentKind(r) === "invoice" &&
        !["Paid", "Cancelled", "Draft"].includes(financialStatus(r)),
    ),
    approvals: all.filter((r) => approvalType(r)),
  };
  return (
    <div className="ops-control">
      <header className="ops-banner">
        <div>
          <span className="eyebrow">OPERATIONAL CONTROL CENTRE</span>
          <h2>Your working day</h2>
          {org.workspaceConfig?.welcomeText && (
            <p>{org.workspaceConfig.welcomeText}</p>
          )}
          <p>
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            · {org.name}
          </p>
        </div>
        <button onClick={() => setCustom(!custom)}>
          {custom ? "Finish customising" : "Customise dashboard"}
        </button>
      </header>
      <div className="ops-action-strip">
        {attendance && canCreate && canEdit && (
          <button className="action-primary" onClick={clock}>
            {site.some((r) => r.person === actor) ? "Clock out" : "Clock in"}
          </button>
        )}
        {canCreate &&
          actions.map((a) => (
            <button
              key={a.label}
              onClick={() =>
                onNavigate(
                  isTaskModule(a.module) ? "Tasks & projects" : a.module,
                  { create: a.label !== "Open bookings" },
                )
              }
            >
              {a.label}
            </button>
          ))}
        <button onClick={() => onNavigate("My work")}>My work</button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {custom && (
        <section className="ops-custom">
          <h3>Arrange your workspace</h3>
          <label>
            Dashboard preset
            <select
              aria-label="Dashboard preset"
              value=""
              onChange={(e) =>
                setPrefs({ ...prefs, widgets: presets[e.target.value] })
              }
            >
              <option value="" disabled>
                Choose preset
              </option>
              {Object.keys(presets).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          {Object.entries(labels)
            .filter(([id]) => available(id))
            .map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={widgets.includes(id)}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      widgets: e.target.checked
                        ? [...widgets, id]
                        : widgets.filter((x) => x !== id),
                    })
                  }
                />
                {label}
              </label>
            ))}
          <button
            onClick={() =>
              setPrefs({
                ...prefs,
                widgets: template,
                wideWidgets: [],
                widgetLimits: {},
              })
            }
          >
            Reset to company template
          </button>
        </section>
      )}
      <div className="ops-widget-grid">
        {widgets.map((id) => (
          <section
            key={id}
            className={
              "ops-widget " +
              (prefs.wideWidgets?.includes(id) ? "ops-wide" : "")
            }
            aria-label={labels[id]}
          >
            <header>
              <h3 aria-label={labels[id]}>
                {labels[id]} <span>{rows[id].length}</span>
              </h3>
              {custom && (
                <div className="quick-actions">
                  <button
                    aria-label={"Move " + labels[id] + " up"}
                    disabled={widgets.indexOf(id) === 0}
                    onClick={() => move(id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={"Move " + labels[id] + " down"}
                    disabled={widgets.indexOf(id) === widgets.length - 1}
                    onClick={() => move(id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        wideWidgets: prefs.wideWidgets?.includes(id)
                          ? prefs.wideWidgets.filter((x) => x !== id)
                          : [...(prefs.wideWidgets || []), id],
                      })
                    }
                  >
                    {prefs.wideWidgets?.includes(id)
                      ? "Standard width"
                      : "Full width"}
                  </button>
                </div>
              )}
            </header>
            {custom && (
              <label className="widget-limit">
                Visible records
                <select
                  aria-label={"Visible records for " + labels[id]}
                  value={prefs.widgetLimits?.[id] || 6}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      widgetLimits: {
                        ...prefs.widgetLimits,
                        [id]: Number(e.target.value),
                      },
                    })
                  }
                >
                  {[3, 6, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {id === "financial" && (
              <p className="widget-summary">
                Outstanding:{" "}
                {money(rows.financial.reduce((n, r) => n + balancePence(r), 0))}{" "}
                (fictional)
              </p>
            )}
            {id === "visitors" && (
              <p className="widget-summary">
                Recorded visitors:{" "}
                {rows.visitors.reduce((n, r) => n + Number(r.count || 0), 0)}
              </p>
            )}
            {rows[id].slice(0, prefs.widgetLimits?.[id] || 6).map((r) => (
              <button
                className="ops-feed-row"
                key={r.id}
                onClick={() => open(r)}
              >
                <span
                  className={"ops-dot " + (id === "attention" ? "urgent" : "")}
                />
                <span>
                  <strong
                    role={id === "staff" ? "heading" : undefined}
                    aria-level={id === "staff" ? 4 : undefined}
                  >
                    {id === "staff" ? r.person || r.title : r.title}
                  </strong>
                  <small>
                    {id === "staff"
                      ? "Clocked in " +
                        r.startTime?.slice(11) +
                        " · " +
                        (r.location || "Location not recorded")
                      : id === "shifts"
                        ? (r.person || "Unassigned") +
                          " · " +
                          r.startTime.replace("T", " ") +
                          " · " +
                          (r.location || "No location")
                        : id === "attention"
                          ? type(r) === "inventory"
                            ? "Low stock: " + r.quantity + " available"
                            : type(r) === "inspections"
                              ? "Failed inspection · review findings"
                              : "Overdue · " + r.dueDate
                          : r.owner || r.location || "Unassigned"}
                  </small>
                </span>
                <Status>
                  {id === "staff"
                    ? "On site"
                    : id === "financial"
                      ? financialStatus(r)
                      : r.result || r.status}
                </Status>
                <span>→</span>
              </button>
            ))}
            {!rows[id].length && (
              <Empty>
                {id === "staff"
                  ? "No open clock-ins at present."
                  : id === "attention"
                    ? "No operational alerts."
                    : "No matching records. Create or assign work to populate this panel."}
              </Empty>
            )}
            {id === "staff" && attendance && (
              <button
                className="text-action"
                onClick={() => onNavigate(attendance)}
              >
                Open attendance & timesheets →
              </button>
            )}
            {id === "shifts" && firstModuleOfType(org, "schedule") && (
              <button
                className="text-action"
                onClick={() => onNavigate(firstModuleOfType(org, "schedule"))}
              >
                Open weekly rota →
              </button>
            )}
          </section>
        ))}
      </div>
      <details className="ops-tools">
        <summary>Your enabled tools</summary>
        <div className="module-shortcut-grid">
          {org.modules.map((m) => (
            <button key={m} onClick={() => onNavigate(m)}>
              {m} →
            </button>
          ))}
        </div>
      </details>
      <p className="module-disclaimer">
        Fictional operations only. Open clock-ins do not verify physical
        presence. Changes reset on refresh.
      </p>
    </div>
  );
}
