import React, { useState } from "react";
import { demoRoleDefaults } from "../customerWorkflows";
export default function PersonPermissions({
  org,
  person,
  records,
  onUpdate,
  canManage,
}) {
  const [message, setMessage] = useState(""),
    policy = person.permissionOverrides || {},
    modules = [
      ...new Set([
        ...(org?.modules || []),
        ...records.filter((r) => r.orgId === person.orgId).map((r) => r.module),
      ]),
    ];
  return (
    <div className="completion-workspace">
      <p>
        Profile restrictions reduce the selected role’s permissions. They cannot
        grant actions the role does not have. Public role switching is a
        demonstration, not secure authentication.
      </p>
      <form
        key={person.id}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (
            await onUpdate(person.orgId, person.id, {
              demoRole: f.get("demoRole"),
              permissionOverrides: {
                disabledActions: f.getAll("actions"),
                disabledModules: f.getAll("modules"),
                department: f.get("department"),
                location: f.get("location"),
                ownOnly: f.get("ownOnly") === "on",
              },
            })
          )
            setMessage(
              "Profile restrictions saved. They apply when Working as this person.",
            );
        }}
      >
        <label>
          Assigned demo role
          <select
            name="demoRole"
            disabled={!canManage}
            defaultValue={person.demoRole || "Staff"}
          >
            {[
              ...new Set([
                ...Object.keys(demoRoleDefaults),
                ...Object.keys(org?.workspaceConfig?.roles || {}),
              ]),
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <fieldset disabled={!canManage}>
          <legend>Disable actions for this profile</legend>
          {[
            "Create",
            "Edit",
            "Approve",
            "Export",
            "Manage",
            "Manage staff",
            "Reports",
          ].map((a) => (
            <label className="task-check" key={a}>
              <input
                name="actions"
                type="checkbox"
                value={a}
                defaultChecked={policy.disabledActions?.includes(a)}
              />
              {a}
            </label>
          ))}
        </fieldset>
        <label>
          Hide modules
          <select
            name="modules"
            multiple
            size="5"
            disabled={!canManage}
            defaultValue={policy.disabledModules || []}
          >
            {modules.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Restrict department
          <input
            name="department"
            disabled={!canManage}
            defaultValue={policy.department || ""}
          />
        </label>
        <label>
          Restrict location
          <input
            name="location"
            disabled={!canManage}
            defaultValue={policy.location || ""}
          />
        </label>
        <label className="task-check">
          <input
            type="checkbox"
            name="ownOnly"
            disabled={!canManage}
            defaultChecked={policy.ownOnly || false}
          />
          Own records only
        </label>
        {canManage && <button>Save person permissions</button>}
      </form>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
