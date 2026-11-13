import React, { useState } from "react";
import { CustomerSettings } from "./CustomerEssentialPages";
import { modules, toggleModule, sectors } from "./model";
export default function CompanyConfiguration({
  org,
  records,
  onConfigure,
  roles,
  roleModules,
  roleTeams,
  canManage,
  ...preferences
}) {
  const [tab, setTab] = useState("Roles & access"),
    [scopeRole, setScopeRole] = useState("Staff"),
    [message, setMessage] = useState(""),
    [logo, setLogo] = useState(org.logo || "");
  const config = org.workspaceConfig || {},
    scope = config.roleScopes?.[scopeRole] || {
      ownership: ["Staff", "Volunteer"].includes(scopeRole) ? "Mine" : "All",
    };
  const save = async (patch, event) => {
    if (!canManage) return false;
    const ok = await onConfigure(patch, event);
    setMessage(
      ok
        ? "Company configuration updated in this fictional workspace."
        : "Configuration could not be saved.",
    );
    return ok;
  };
  const saveField = (key, value) =>
    save({ workspaceConfig: { [key]: value } }, "Updated " + key);
  const rolesProps = {
    roles,
    roleModules,
    roleTeams,
    setRoles: (update) =>
      saveField("roles", typeof update === "function" ? update(roles) : update),
    setRoleModules: (update) =>
      saveField(
        "roleModules",
        typeof update === "function" ? update(roleModules) : update,
      ),
    setRoleTeams: (update) =>
      saveField(
        "roleTeams",
        typeof update === "function" ? update(roleTeams) : update,
      ),
  };
  const fields = (data, key) => String(data.get(key) || "").trim();
  return (
    <div className="admin-workspace">
      <div className="ops-banner">
        <div>
          <span className="eyebrow">COMPANY CONFIGURATION</span>
          <h2>Company settings</h2>
          <p>
            Settings affect this fictional customer, not owner-platform
            administration.
          </p>
        </div>
      </div>
      <div className="admin-tabs">
        {[
          "Company profile",
          "Operations",
          "Roles & access",
          "Modules",
          "Appearance",
          "Notifications",
          "Workflow rules",
        ].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
      {tab === "Company profile" && (
        <form
          className="admin-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (!fields(f, "name")) {
              setMessage("Enter a company name.");
              return;
            }
            save(
              {
                name: fields(f, "name"),
                sector: fields(f, "sector"),
                contactPhone: fields(f, "phone"),
                contactEmail: fields(f, "email"),
                address: fields(f, "address"),
                description: fields(f, "description"),
              },
              "Updated company profile",
            );
          }}
        >
          <label>
            Company name
            <input
              name="name"
              defaultValue={org.name}
              required
              maxLength={100}
              disabled={!canManage}
            />
          </label>
          <label>
            Industry
            <select
              name="sector"
              defaultValue={org.sector}
              disabled={!canManage}
            >
              {Object.entries(sectors).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Company telephone
            <input
              name="phone"
              type="tel"
              maxLength={40}
              defaultValue={org.contactPhone || ""}
              disabled={!canManage}
            />
          </label>
          <label>
            Company email
            <input
              type="email"
              name="email"
              defaultValue={org.contactEmail || ""}
              maxLength={150}
              disabled={!canManage}
            />
          </label>
          <label>
            Company address
            <textarea
              name="address"
              defaultValue={org.address || ""}
              maxLength={500}
              disabled={!canManage}
            />
          </label>
          <label>
            Company description
            <textarea
              name="description"
              defaultValue={org.description || ""}
              maxLength={1000}
              disabled={!canManage}
            />
          </label>
          <p>
            Industry template: {org.sector}. Changes preserve current records
            and modules; dashboard reset uses this industry template.
          </p>
          <button disabled={!canManage}>Save company profile</button>
        </form>
      )}
      {tab === "Operations" && (
        <form
          className="admin-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              start = fields(f, "start"),
              end = fields(f, "end"),
              days = f.getAll("days").map(Number),
              leaveDays = Number(f.get("leaveDays")),
              minimumShifts = Number(f.get("minimumShifts"));
            if (
              end <= start ||
              !days.length ||
              leaveDays < 0 ||
              leaveDays > 365 ||
              minimumShifts < 0 ||
              minimumShifts > 50
            ) {
              setMessage(
                "Choose valid working hours, at least one business day and valid allowances.",
              );
              return;
            }
            saveField("operations", {
              departments: fields(f, "departments")
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
              locations: fields(f, "locations")
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
              start,
              end,
              days,
              leaveDays,
              minimumShifts,
            });
          }}
        >
          <div className="form-pair">
            <label>
              Departments (one per line)
              <textarea
                name="departments"
                defaultValue={(
                  config.operations?.departments || [
                    ...new Set(records.map((r) => r.team).filter(Boolean)),
                  ]
                ).join("\n")}
                disabled={!canManage}
              />
            </label>
            <label>
              Locations (one per line)
              <textarea
                name="locations"
                defaultValue={(
                  config.operations?.locations || [
                    ...new Set(records.map((r) => r.location).filter(Boolean)),
                  ]
                ).join("\n")}
                disabled={!canManage}
              />
            </label>
            <label>
              Working day starts
              <input
                name="start"
                type="time"
                defaultValue={config.operations?.start || "09:00"}
                required
                disabled={!canManage}
              />
            </label>
            <label>
              Working day ends
              <input
                name="end"
                type="time"
                defaultValue={config.operations?.end || "17:00"}
                required
                disabled={!canManage}
              />
            </label>
          </div>
          <fieldset>
            <legend>Business days</legend>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <label className="task-check" key={d}>
                <input
                  type="checkbox"
                  name="days"
                  value={i}
                  defaultChecked={(
                    config.operations?.days || [1, 2, 3, 4, 5]
                  ).includes(i)}
                  disabled={!canManage}
                />
                {d}
              </label>
            ))}
          </fieldset>
          <div className="form-pair">
            <label>
              Annual leave allowance (business days)
              <input
                type="number"
                name="leaveDays"
                min="0"
                max="365"
                defaultValue={config.operations?.leaveDays ?? 25}
                required
                disabled={!canManage}
              />
            </label>
            <label>
              Minimum daily shifts
              <input
                type="number"
                name="minimumShifts"
                min="0"
                max="50"
                defaultValue={config.operations?.minimumShifts ?? 1}
                required
                disabled={!canManage}
              />
            </label>
          </div>
          <button disabled={!canManage}>Save operational settings</button>
        </form>
      )}
      {tab === "Roles & access" && (
        <>
          <CustomerSettings
            org={org}
            records={records}
            {...preferences}
            {...rolesProps}
            canManage={canManage}
          />
          <div className="admin-panel">
            <h3>Record scopes & sensitive records</h3>
            <label>
              Scope role
              <select
                aria-label="Scope role"
                value={scopeRole}
                onChange={(e) => setScopeRole(e.target.value)}
              >
                {Object.keys(roles).map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Record ownership
              <select
                aria-label="Record ownership scope"
                value={scope.ownership || "All"}
                disabled={!canManage}
                onChange={(e) =>
                  saveField("roleScopes", {
                    ...config.roleScopes,
                    [scopeRole]: { ...scope, ownership: e.target.value },
                  })
                }
              >
                <option>All</option>
                <option>Mine</option>
              </select>
            </label>
            <label>
              Location restriction
              <select
                value={scope.location || ""}
                disabled={!canManage}
                onChange={(e) =>
                  saveField("roleScopes", {
                    ...config.roleScopes,
                    [scopeRole]: { ...scope, location: e.target.value },
                  })
                }
              >
                <option value="">All locations</option>
                {[
                  ...new Set(
                    [
                      ...(config.operations?.locations || []),
                      ...records.map((r) => r.location),
                    ].filter(Boolean),
                  ),
                ].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="task-check">
              <input
                type="checkbox"
                disabled={!canManage || scopeRole === "Administrator"}
                checked={
                  Boolean(scope.sensitive) || scopeRole === "Administrator"
                }
                onChange={(e) =>
                  saveField("roleScopes", {
                    ...config.roleScopes,
                    [scopeRole]: { ...scope, sensitive: e.target.checked },
                  })
                }
              />
              View sensitive records (administrator always permitted)
            </label>
            <p>
              Team/department restrictions use the existing role team selector
              above. Unknown ownership/location records are excluded when their
              restriction applies.
            </p>
          </div>
        </>
      )}
      {tab === "Modules" && (
        <div className="admin-panel">
          <h3>Enabled business modules</h3>
          <p>
            Dependencies are applied automatically. Disabling access preserves
            the existing records.
          </p>
          <div className="permission-grid">
            {modules.map((m) => (
              <label className="task-check" key={m.name}>
                <input
                  type="checkbox"
                  checked={org.modules.includes(m.name)}
                  disabled={!canManage}
                  onChange={() =>
                    save(
                      { modules: toggleModule(org.modules, m.name) },
                      "Changed enabled modules",
                    )
                  }
                />
                <span>
                  {m.name}
                  <small>
                    {m.requires?.length
                      ? " Requires " + m.requires.join(", ")
                      : ""}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      {tab === "Appearance" && (
        <form
          className="admin-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save(
              {
                color: String(f.get("color")),
                logo,
                workspaceConfig: {
                  welcomeText: fields(f, "welcome"),
                  navLabels: Object.fromEntries(
                    org.modules.map((m, i) => [m, fields(f, "label" + i) || m]),
                  ),
                },
              },
              "Updated workspace appearance",
            );
          }}
        >
          <label>
            Brand accent
            <input
              name="color"
              type="color"
              defaultValue={org.color}
              disabled={!canManage}
            />
          </label>
          <label>
            Welcome message
            <input
              name="welcome"
              maxLength={150}
              defaultValue={config.welcomeText || ""}
              disabled={!canManage}
            />
          </label>
          <label>
            Company logo (local image, up to 200 KB)
            <input
              type="file"
              accept="image/png,image/jpeg"
              disabled={!canManage}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  file.size > 200000 ||
                  !["image/png", "image/jpeg"].includes(file.type)
                ) {
                  setMessage("Select a PNG or JPEG up to 200 KB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setLogo(reader.result);
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {logo && (
            <img
              className="company-logo-preview"
              alt="Local company logo preview"
              src={logo}
            />
          )}
          <button
            type="button"
            disabled={!canManage}
            onClick={() => setLogo("")}
          >
            Remove logo preview
          </button>
          <details>
            <summary>Navigation labels</summary>
            {org.modules.map((m, i) => (
              <label key={m}>
                {m}
                <input
                  name={"label" + i}
                  defaultValue={config.navLabels?.[m] || m}
                  maxLength={50}
                  disabled={!canManage}
                />
              </label>
            ))}
          </details>
          <button disabled={!canManage}>Save appearance</button>
          <p>
            Logo data remains in fictional browser memory. No server file upload
            occurs.
          </p>
        </form>
      )}
      {tab === "Notifications" && (
        <form
          className="admin-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              reminderDays = Number(f.get("reminderDays"));
            if (reminderDays < 1 || reminderDays > 90) {
              setMessage("Choose a reminder interval from 1 to 90 days.");
              return;
            }
            saveField("notificationDefaults", {
              reminderDays,
              priorityOnly: f.get("priorityOnly") === "on",
              disabledCategories: [
                "Tasks",
                "Maintenance",
                "Inspections",
                "People",
                "Stock",
                "Bookings",
                "Finance",
                "Approvals",
                "Communications",
              ].filter((c) => !f.getAll("categories").includes(c)),
            });
          }}
        >
          <h3>Company notification defaults</h3>
          <label>
            Default reminder days
            <input
              type="number"
              name="reminderDays"
              min="1"
              max="90"
              required
              defaultValue={config.notificationDefaults?.reminderDays || 14}
              disabled={!canManage}
            />
          </label>
          <label className="task-check">
            <input
              type="checkbox"
              name="priorityOnly"
              defaultChecked={config.notificationDefaults?.priorityOnly}
              disabled={!canManage}
            />
            Priority alerts by default
          </label>
          {[
            "Tasks",
            "Maintenance",
            "Inspections",
            "People",
            "Stock",
            "Bookings",
            "Finance",
            "Approvals",
            "Communications",
          ].map((c) => (
            <label className="task-check" key={c}>
              <input
                type="checkbox"
                name="categories"
                value={c}
                defaultChecked={
                  !config.notificationDefaults?.disabledCategories?.includes(c)
                }
                disabled={!canManage}
              />
              {c}
            </label>
          ))}
          <button disabled={!canManage}>Save notification defaults</button>
          <p>
            Applies to users without overrides. Personal notification
            preferences take precedence; no external delivery is configured.
          </p>
        </form>
      )}
      {tab === "Workflow rules" && (
        <div className="admin-panel">
          <h3>Approval policy</h3>
          <label className="task-check">
            <input
              type="checkbox"
              disabled={!canManage}
              checked={config.disallowSelfApproval !== false}
              onChange={(e) =>
                saveField("disallowSelfApproval", e.target.checked)
              }
            />
            Prevent self-approval
          </label>
          <p>
            Applies to central approval decisions. Each request can additionally
            name an approver.
          </p>
          <button
            onClick={() => preferences.onNavigate("Automations")}
            disabled={!canManage}
          >
            Open workflow automations
          </button>
          <button onClick={() => preferences.onNavigate("Notifications")}>
            Open notification preferences
          </button>
        </div>
      )}
      <p className="module-disclaimer">
        Company settings, roles and record scopes are fictional UI/workflow
        controls. Production authorization remains server-enforced work; no
        private customer data belongs in this demo.
      </p>
    </div>
  );
}
