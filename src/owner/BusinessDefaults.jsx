import { ownerPageAllowed } from "./rules";
import React, { useState } from "react";
import { demoRoleDefaults } from "../customerWorkflows";
export default function BusinessDefaults({ controller: c }) {
  const [message, setMessage] = useState(""),
    b = c.flags.business || {};
  return (
    <div className="completion-workspace">
      <details>
        <summary>
          Support defaults, owner alerts and onboarding templates
        </summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)),
              categories = f.categories
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              priorities = [
                ...new Set([
                  "Low",
                  "Normal",
                  "High",
                  "Urgent",
                  ...f.priorities
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                ]),
              ];
            if (!categories.length) {
              setMessage("Add at least one support category.");
              return;
            }
            if (
              await c.setFlags({
                ...c.flags,
                business: {
                  ...b,
                  supportCategories: categories,
                  supportPriorities: priorities,
                  defaultTrialDays: Number(f.trial),
                  defaultAccent: f.accent,
                  defaultWelcome: f.welcome,
                },
              })
            ) {
              await c.log("Updated support and onboarding defaults");
              setMessage("Business defaults saved.");
            }
          }}
        >
          <label>
            Support categories (one per line)
            <textarea
              name="categories"
              required
              defaultValue={(
                b.supportCategories || [
                  "General",
                  "Configuration",
                  "Problem",
                  "Feature request",
                ]
              ).join("\n")}
            />
          </label>
          <label>
            Additional support priorities
            <textarea
              name="priorities"
              defaultValue={(b.supportPriorities || [])
                .filter((p) => !["Low", "Normal", "High", "Urgent"].includes(p))
                .join("\n")}
            />
          </label>
          <label>
            Default trial period (days)
            <input
              name="trial"
              type="number"
              min="0"
              max="365"
              required
              defaultValue={b.defaultTrialDays ?? 14}
            />
          </label>
          <label>
            Default customer accent
            <input
              type="color"
              name="accent"
              defaultValue={b.defaultAccent || "#315b77"}
            />
          </label>
          <label>
            Default customer welcome
            <input name="welcome" defaultValue={b.defaultWelcome || ""} />
          </label>
          <button>Save support and onboarding defaults</button>
        </form>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)),
              o = c.orgs.find((o) => o.id === f.orgId),
              config = o.workspaceConfig || {};
            if (
              await c.setFlags({
                ...c.flags,
                onboardingTemplates: [
                  ...(c.flags.onboardingTemplates || []),
                  {
                    id: crypto.randomUUID(),
                    name: f.name,
                    sector: o.sector,
                    industry: o.industry,
                    modules: o.modules,
                    plan: o.plan,
                    color: o.color,
                    logo: o.logo || "",
                    welcomeText: config.welcomeText || "",
                    dashboard: config.dashboardPreset || "Operations",
                    locations: (
                      config.operations?.locations || ["Main site"]
                    ).join("\n"),
                    departments: (
                      config.operations?.departments || ["Operations"]
                    ).join("\n"),
                    roles: [
                      "Administrator",
                      ...Object.keys(config.roles || {}).filter(
                        (r) => r !== "Administrator" && demoRoleDefaults[r],
                      ),
                    ],
                  },
                ],
              })
            )
              setMessage(
                "Onboarding template saved. Choose it in the onboarding wizard.",
              );
          }}
        >
          <h3>Reusable onboarding configuration</h3>
          <label>
            Template name
            <input name="name" required maxLength={100} />
          </label>
          <label>
            Copy configuration from company
            <select name="orgId">
              {c.orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <button>Save onboarding template</button>
        </form>
        {(c.flags.onboardingTemplates || []).map((t) => (
          <p key={t.id}>
            {t.name} · {t.modules.length} modules{" "}
            <button
              onClick={() =>
                c.setFlags({
                  ...c.flags,
                  onboardingTemplates: c.flags.onboardingTemplates.filter(
                    (x) => x.id !== t.id,
                  ),
                })
              }
            >
              Remove onboarding template
            </button>
          </p>
        ))}
      </details>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
export function OwnerAlerts({ controller: c, data }) {
  const prefs = c.flags.ownerUserPrefs?.[c.ownerAccountId || c.ownerRole] || {},
    today = new Date().toISOString().slice(0, 10),
    cutoff = new Date(Date.now() + Number(prefs.days || 14) * 86400000)
      .toISOString()
      .slice(0, 10),
    [message, setMessage] = useState("");
  const notices = [
    ...(prefs.support !== false
      ? c.tickets
          .filter(
            (t) =>
              ["High", "Urgent", "Critical"].includes(t.priority) &&
              !["Resolved", "Closed"].includes(t.status),
          )
          .map((t) => ({
            id: "ticket:" + t.id + ":" + t.status,
            title: t.subject,
            page: "Support",
          }))
      : []),
    ...(prefs.renewals !== false
      ? c.orgs
          .filter(
            (o) =>
              o.renewalDate &&
              o.renewalDate <= cutoff &&
              o.subscriptionStatus !== "Cancelled",
          )
          .map((o) => ({
            id: "renewal:" + o.id + ":" + o.renewalDate,
            title: o.name + " renewal " + o.renewalDate,
            page: "Subscriptions",
          }))
      : []),
    ...(prefs.sales !== false
      ? (data.leads || [])
          .filter(
            (l) =>
              l.followUp &&
              l.followUp <= today &&
              !["Won", "Lost"].includes(l.stage),
          )
          .map((l) => ({
            id: "lead:" + l.id + ":" + l.followUp,
            title: l.name + " follow-up",
            page: "Sales Leads",
          }))
      : []),
  ];
  const visibleNotices = notices.filter((n) =>
    ownerPageAllowed(c.ownerRole, n.page, c.flags.ownerPolicies),
  );
  return (
    <details className="completion-workspace">
      <summary>
        Owner alerts ·{" "}
        {visibleNotices.filter((n) => !prefs.read?.includes(n.id)).length}{" "}
        unread
      </summary>
      <p>
        Generated from fictional support, subscription and sales records. No
        email or push delivery.
      </p>
      {visibleNotices.map((n) => (
        <p key={n.id}>
          {prefs.read?.includes(n.id) ? "Read" : "Unread"} · {n.title}{" "}
          <button onClick={() => c.navigate(n.page)}>Open record area</button>
          <button
            onClick={() =>
              c.saveOwnerPreferences({
                ...prefs,
                read: [...new Set([...(prefs.read || []), n.id])],
              })
            }
          >
            Mark read
          </button>
        </p>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (
            await c.saveOwnerPreferences({
              ...prefs,
              support: f.get("support") === "on",
              renewals: f.get("renewals") === "on",
              sales: f.get("sales") === "on",
              days: Number(f.get("days")),
            })
          )
            setMessage("Owner alert preferences saved.");
        }}
      >
        {["support", "renewals", "sales"].map((key) => (
          <label key={key} className="task-check">
            <input
              type="checkbox"
              name={key}
              defaultChecked={prefs[key] !== false}
            />
            {key} alerts
          </label>
        ))}
        <label>
          Renewal reminder days
          <input
            name="days"
            type="number"
            min="1"
            max="365"
            defaultValue={prefs.days || 14}
          />
        </label>
        <button>Save owner alert preferences</button>
      </form>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
