import { dashboardWidgetsFor } from "./rules";
import React, { useState } from "react";
import { modules, sectors, toggleModule } from "../model";
import { demoRoleDefaults } from "../customerWorkflows";
const steps = [
  "Company details",
  "Industry template",
  "Modules",
  "Package",
  "Branding",
  "Locations & departments",
  "Permissions",
  "Review",
  "Create",
];
export default function OnboardingWizard({ controller: c, draft, onCreated }) {
  const [step, setStep] = useState(0),
    [v, setV] = useState({
      name: draft?.name || "",
      contactPerson: draft?.contact || "",
      contactEmail: draft?.email || "",
      contactPhone: draft?.phone || "",
      description: draft?.notes || "",
      sector:
        draft?.sector === "Charity"
          ? "charity"
          : draft?.sector === "Visitor attraction"
            ? "visitor"
            : "engineering",
      industry: ["Charity", "Visitor attraction"].includes(draft?.sector)
        ? draft.sector
        : "Engineering",
      modules: [...sectors.engineering.modules],
      plan: c.flags.business?.defaultPlan || c.plans[0]?.name,
      color: c.flags.business?.defaultAccent || "#315b77",
      welcomeText: c.flags.business?.defaultWelcome || "",
      dashboard: "Engineering",
      locations: "Office\nWorkshop",
      departments: "Operations\nAdministration",
      administrator: "Fictional administrator",
      roles: ["Administrator", "Manager", "Staff", "Viewer"],
    }),
    [logo, setLogo] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [createdId, setCreatedId] = useState(draft?.companyId || "");
  const set = (p) => setV((x) => ({ ...x, ...p }));
  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (step === 2 && !v.modules.length) {
      setMessage("Select at least one module.");
      return;
    }
    if (step < 8) {
      setStep(step + 1);
      return;
    }
    if (busy) return;
    setBusy(true);
    let company;
    const ok = await c.run(async () => {
      company = createdId
        ? c.backend.getSnapshot().orgs.find((o) => o.id === createdId)
        : await c.backend.organisations.create({
            name: v.name,
            sector: v.sector,
          });
      setCreatedId(company.id);
      await c.backend.entitlements.replace(company.id, v.modules);
      await c.backend.memberships.replace(company.id, [
        { name: v.administrator, role: "Organisation admin" },
      ]);
      const plan = c.plans.find((p) => p.name === v.plan),
        now = new Date();
      await c.backend.organisations.update(company.id, {
        industry: v.industry,
        description: v.description,
        contactPerson: v.contactPerson,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone,
        plan: v.plan,
        color: v.color,
        logo,
        createdAt: now.toISOString(),
        onboardingComplete: true,
        trialEnds: new Date(
          now.getTime() +
            Number(c.flags.business?.defaultTrialDays ?? plan?.trial ?? 0) *
              86400000,
        )
          .toISOString()
          .slice(0, 10),
        workspaceConfig: {
          welcomeText: v.welcomeText,
          dashboardPreset: v.dashboard,
          dashboardPrefs: { widgets: dashboardWidgetsFor(v.dashboard) },
          roles: Object.fromEntries(
            v.roles.map((r) => [r, demoRoleDefaults[r]]),
          ),
          operations: {
            locations: v.locations
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
            departments: v.departments
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
          },
        },
      });
    });
    setBusy(false);
    if (ok) {
      await c.log("Company onboarded: " + v.name, company.id);
      onCreated?.(company.id);
      setMessage(
        "Fictional company created. Modules, package and branding applied.",
      );
    } else
      setMessage(
        "Creation or configuration failed. Retry to complete the same company.",
      );
  };
  return (
    <div className="owner-onboarding">
      <span className="eyebrow">CUSTOMER PROVISIONING</span>
      <h2>Guided company onboarding</h2>
      <p>
        Creates an organisation in this public demo. No real accounts,
        invitations or billing are created.
      </p>
      <ol className="owner-wizard-steps">
        {steps.map((s, i) => (
          <li key={s} aria-current={step === i ? "step" : undefined}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      {!createdId ||
      !c.orgs.find((o) => o.id === createdId)?.onboardingComplete ? (
        <form onSubmit={submit}>
          {step === 0 && (
            <label>
              Saved onboarding template
              <select
                value=""
                onChange={(e) => {
                  const t = c.flags.onboardingTemplates?.find(
                    (t) => t.id === e.target.value,
                  );
                  if (t) {
                    const { id, name, logo, ...configuration } = t;
                    void id;
                    void name;
                    set(configuration);
                    setLogo(logo || "");
                  }
                }}
              >
                <option value="">Choose reusable configuration</option>
                {(c.flags.onboardingTemplates || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {step === 0 && (
            <>
              {[
                ["name", "Fictional company name"],
                ["contactPerson", "Contact person"],
                ["contactEmail", "Contact email"],
                ["contactPhone", "Telephone"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type={key === "contactEmail" ? "email" : "text"}
                    required={key === "name"}
                    maxLength={key === "name" ? 80 : 120}
                    value={v[key]}
                    onChange={(e) => set({ [key]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Company description
                <textarea
                  value={v.description}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </label>
            </>
          )}
          {step === 1 && (
            <label>
              Industry template
              <select
                value={v.industry}
                onChange={(e) => {
                  const industry = e.target.value,
                    sector =
                      industry === "Charity"
                        ? "charity"
                        : industry === "Visitor attraction"
                          ? "visitor"
                          : "engineering";
                  const recommended =
                    industry === "Professional services" ||
                    industry === "Retail" ||
                    industry === "Other"
                      ? [
                          "Tasks & projects",
                          "Staff & volunteers",
                          "Customers / CRM",
                          "Quotes and invoices",
                          "Documents & files",
                          "Bookings and appointments",
                        ]
                      : sectors[sector].modules;
                  set({
                    industry,
                    sector,
                    modules: recommended,
                    dashboard:
                      sector === "charity"
                        ? "Community"
                        : sector === "visitor"
                          ? "Visitor"
                          : "Engineering",
                    color: sectors[sector].color,
                  });
                }}
              >
                {[
                  "Engineering",
                  "Charity",
                  "Visitor attraction",
                  "Professional services",
                  "Retail",
                  "Other",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          {step === 2 && (
            <>
              <p>Dependencies are added automatically.</p>
              <div className="permission-grid">
                {modules.map((m) => (
                  <label className="task-check" key={m.name}>
                    <input
                      type="checkbox"
                      checked={v.modules.includes(m.name)}
                      onChange={() =>
                        set({ modules: toggleModule(v.modules, m.name) })
                      }
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <label>
              Configured package
              <select
                value={v.plan}
                onChange={(e) => set({ plan: e.target.value })}
              >
                {c.plans.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          {step === 4 && (
            <>
              <label>
                Accent colour
                <input
                  type="color"
                  value={v.color}
                  onChange={(e) => set({ color: e.target.value })}
                />
              </label>
              <label>
                Welcome message
                <input
                  value={v.welcomeText}
                  onChange={(e) => set({ welcomeText: e.target.value })}
                />
              </label>
              <label>
                Dashboard preset
                <select
                  value={v.dashboard}
                  onChange={(e) => set({ dashboard: e.target.value })}
                >
                  {["Engineering", "Operations", "Community", "Visitor"].map(
                    (p) => (
                      <option key={p}>{p}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Local logo (PNG/JPEG, up to 200 KB)
                <input
                  type="file"
                  accept="image/png,image/jpeg"
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
                    const r = new FileReader();
                    r.onload = () => setLogo(r.result);
                    r.readAsDataURL(file);
                  }}
                />
              </label>
              <div
                className="owner-brand-sample"
                style={{ borderColor: v.color }}
              >
                <strong>{v.name}</strong>
                <p>{v.welcomeText}</p>
                {logo && <img src={logo} alt="Local logo preview" />}
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <label>
                Locations (one per line)
                <textarea
                  required
                  value={v.locations}
                  onChange={(e) => set({ locations: e.target.value })}
                />
              </label>
              <label>
                Departments (one per line)
                <textarea
                  required
                  value={v.departments}
                  onChange={(e) => set({ departments: e.target.value })}
                />
              </label>
            </>
          )}
          {step === 6 && (
            <>
              <label>
                Initial administrator name
                <input
                  required
                  value={v.administrator}
                  onChange={(e) => set({ administrator: e.target.value })}
                />
              </label>
              <p>Administrator is retained. Select default customer roles:</p>
              {Object.keys(demoRoleDefaults).map((r) => (
                <label className="task-check" key={r}>
                  <input
                    type="checkbox"
                    disabled={r === "Administrator"}
                    checked={v.roles.includes(r)}
                    onChange={(e) =>
                      set({
                        roles: e.target.checked
                          ? [...v.roles, r]
                          : v.roles.filter((x) => x !== r),
                      })
                    }
                  />
                  {r}
                </label>
              ))}
            </>
          )}
          {step === 7 && (
            <>
              <h3>{v.name}</h3>
              <p>
                {v.industry} · {v.plan} · {v.contactPerson} · {v.contactEmail}
              </p>
              <p>{v.description}</p>
              <p>Modules: {v.modules.join(", ")}</p>
              <p>
                Locations: {v.locations} · Departments: {v.departments}
              </p>
              <p>
                Roles: {v.roles.join(", ")} · Administrator {v.administrator}
              </p>
              <p>
                Welcome: {v.welcomeText} · Preset {v.dashboard}
              </p>
            </>
          )}
          {step === 8 && (
            <p>Create {v.name} with the reviewed configuration.</p>
          )}
          <div className="owner-quick-actions">
            {step > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button disabled={busy}>
              {step === 8
                ? busy
                  ? "Creating…"
                  : "Create fictional workspace"
                : "Next step"}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => c.preview(createdId)}>
          Open new customer workspace
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
