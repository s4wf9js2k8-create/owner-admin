import React from "react";
import { sectors } from "../model";
import { Panel, Status } from "../components";
export default function CompanyProfilePage({ controller }) {
  const {
    selected,
    setSelected,
    orgs,
    setForm,
    active,
    flags,
    preview,
    update,
    setConfirm,
    log,
    run,
    backend,
    navigate,
  } = controller;
  return (
    <>
      <div className="toolbar">
        <label>
          Organisation
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setForm({ type: "edit", org: active })}>
          Edit profile
        </button>
        <button
          disabled={!flags.customerPreview || active.status === "Archived"}
          onClick={() => preview(active.id)}
        >
          Preview customer dashboard
        </button>
      </div>
      <Panel title={active.name}>
        <div className="org-meta">
          <Status>{active.status}</Status>
          <span>{sectors[active.sector].label}</span>
          <small>{active.id}</small>
        </div>
        <div className="profile-grid">
          <label>
            Brand colour
            <input
              type="color"
              value={active.color}
              onChange={(e) =>
                update(
                  active.id,
                  { color: e.target.value },
                  "Updated sample branding",
                )
              }
            />
          </label>
          <label>
            Account status
            <select
              value={active.status}
              onChange={(e) =>
                setConfirm({
                  id: active.id,
                  status: e.target.value,
                })
              }
            >
              {["Trial", "Active", "Suspended", "Archived"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Internal sample notes
            <textarea
              value={active.notes}
              maxLength={500}
              onChange={(e) =>
                run(() =>
                  backend.organisations.update(active.id, {
                    notes: e.target.value,
                  }),
                )
              }
              onBlur={() => log("Updated sample profile notes")}
            />
          </label>
        </div>
        <p>
          {active.modules.length} modules · {active.plan} · {active.cycle}
        </p>
        <button onClick={() => navigate("Modules")}>Configure modules</button>
        <button onClick={() => navigate("Subscriptions")}>
          Manage subscription
        </button>
      </Panel>
      <Panel title="Example administrators">
        <p>No accounts or invitations are created.</p>
        {active.admins.map((a, i) => (
          <div className="ticket" key={i}>
            <span>{a.name}</span>
            <select
              aria-label={"Role for " + a.name}
              value={a.role}
              onChange={(e) =>
                update(
                  active.id,
                  {
                    admins: active.admins.map((x, j) =>
                      i === j ? { ...x, role: e.target.value } : x,
                    ),
                  },
                  "Changed sample administrator role",
                )
              }
            >
              {["Organisation admin", "Manager", "Viewer"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={() =>
                update(
                  active.id,
                  {
                    admins: active.admins.filter((_, j) => j !== i),
                  },
                  "Removed sample administrator",
                )
              }
            >
              Remove sample
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            update(
              active.id,
              {
                admins: [
                  ...active.admins,
                  {
                    name: "Sample coordinator " + (active.admins.length + 1),
                    role: "Viewer",
                  },
                ],
              },
              "Added sample administrator",
            )
          }
        >
          Add sample administrator
        </button>
      </Panel>
    </>
  );
}
