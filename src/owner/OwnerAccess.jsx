import React, { useState } from "react";
import {
  ownerRoles,
  ownerPages,
  configuredOwnerRoles,
  ownerPageAllowed,
  ownerCanManage,
} from "./rules";
export default function OwnerAccess({ controller: c }) {
  const [role, setRole] = useState("Support Agent"),
    [message, setMessage] = useState("");
  const policies = c.flags.ownerPolicies || {},
    rule = policies.roles?.[role] || {},
    canManage = ownerCanManage(c.ownerRole, policies);
  const save = async (flags) => {
    if (await c.setFlags(flags)) {
      await c.log("Updated fictional owner accounts/permissions");
      setMessage("Owner configuration saved for this session.");
    }
  };
  return (
    <div className="completion-workspace">
      <h2>Owner accounts and permission matrix</h2>
      <p>
        Fictional accounts and role previews; no passwords, invitations, real
        authentication or secure access are created. Platform Owner retains full
        control.
      </p>
      <div className="purpose-grid">
        {(c.flags.ownerAccounts || []).map((a) => (
          <article className="purpose-card" key={a.id}>
            <h3>{a.name}</h3>
            <p>
              {a.email} · {a.role} · {a.status}
            </p>
            {canManage && (
              <label>
                Role for {a.name}
                <select
                  value={a.role}
                  onChange={(e) =>
                    save({
                      ...c.flags,
                      ownerAccounts: c.flags.ownerAccounts.map((x) =>
                        x.id === a.id ? { ...x, role: e.target.value } : x,
                      ),
                    })
                  }
                >
                  {configuredOwnerRoles(c.flags).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            )}
            {canManage && (
              <button
                onClick={() =>
                  save({
                    ...c.flags,
                    ownerAccounts: c.flags.ownerAccounts.map((x) =>
                      x.id === a.id
                        ? {
                            ...x,
                            status:
                              x.status === "Active" ? "Suspended" : "Active",
                          }
                        : x,
                    ),
                  })
                }
              >
                {a.status === "Active"
                  ? "Suspend fictional account"
                  : "Reactivate fictional account"}
              </button>
            )}
          </article>
        ))}
      </div>
      {canManage && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form));
            if (
              (c.flags.ownerAccounts || []).some(
                (a) => a.email.toLowerCase() === f.email.toLowerCase(),
              )
            ) {
              setMessage("That fictional email already has an account record.");
              return;
            }
            await save({
              ...c.flags,
              ownerAccounts: [
                ...(c.flags.ownerAccounts || []),
                { ...f, id: crypto.randomUUID(), status: "Active" },
              ],
            });
            form.reset();
          }}
        >
          <h3>Create fictional owner account</h3>
          <label>
            Owner account name
            <input name="name" required />
          </label>
          <label>
            Fictional owner email
            <input
              name="email"
              type="email"
              required
              placeholder="name@example.invalid"
            />
          </label>
          <label>
            Owner account role
            <select name="role">
              {configuredOwnerRoles(c.flags).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button>Create owner account record</button>
        </form>
      )}
      {canManage && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form));
            if (
              configuredOwnerRoles(c.flags).some(
                (r) => r.toLowerCase() === f.name.toLowerCase(),
              )
            ) {
              setMessage("That role name already exists.");
              return;
            }
            await save({
              ...c.flags,
              ownerPolicies: {
                ...policies,
                customRoles: [...(policies.customRoles || []), f],
              },
            });
            form.reset();
          }}
        >
          <h3>Create custom owner role</h3>
          <label>
            Custom owner role name
            <input name="name" required />
          </label>
          <label>
            Owner role template
            <select name="base">
              {ownerRoles
                .filter((r) => r !== "Platform Owner")
                .map((r) => (
                  <option key={r}>{r}</option>
                ))}
            </select>
          </label>
          <button>Create owner role</button>
        </form>
      )}
      <label>
        Edit owner permission role
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {configuredOwnerRoles(c.flags).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <form
        key={role}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await save({
            ...c.flags,
            ownerPolicies: {
              ...policies,
              roles: {
                ...policies.roles,
                [role]: {
                  disabledPages: f.getAll("hide"),
                  disabledWrites: f.getAll("readonlyPage"),
                  readOnly: f.get("readOnly") === "on",
                },
              },
            },
          });
        }}
      >
        <fieldset disabled={!canManage || role === "Platform Owner"}>
          <legend>Owner page permissions</legend>
          <label className="task-check">
            <input
              name="readOnly"
              type="checkbox"
              defaultChecked={rule.readOnly || false}
            />
            Read-only role
          </label>
          <div className="owner-permission-grid">
            {ownerPages.map((p) => (
              <article className="completion-entry" key={p}>
                <strong>{p}</strong>
                <p>
                  {ownerPageAllowed(role, p, {
                    ...policies,
                    roles: { ...policies.roles, [role]: {} },
                  })
                    ? "Available in role template"
                    : "Outside template access"}
                </p>
                <label className="task-check">
                  <input
                    type="checkbox"
                    name="hide"
                    value={p}
                    defaultChecked={rule.disabledPages?.includes(p)}
                  />
                  Hide page
                </label>
                <label className="task-check">
                  <input
                    type="checkbox"
                    name="readonlyPage"
                    value={p}
                    defaultChecked={rule.disabledWrites?.includes(p)}
                  />
                  Prevent writes
                </label>
              </article>
            ))}
          </div>
          <button>Save owner permission matrix</button>
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
