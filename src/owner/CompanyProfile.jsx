import React, { useState } from "react";
import OriginalProfile from "../pages/CompanyProfilePage";
import ModulesPage from "../pages/ModulesPage";
import SubscriptionsPage from "../pages/SubscriptionsPage";
import { Panel } from "../components";
export default function CompanyProfile({ controller: c }) {
  const [tab, setTab] = useState("Overview"),
    o = c.active;
  return (
    <div>
      <div className="admin-tabs">
        {[
          "Overview",
          "Modules",
          "Users",
          "Subscription",
          "Branding",
          "Support",
          "Activity",
        ].map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && <OriginalProfile controller={c} />}{" "}
      {tab === "Modules" && <ModulesPage controller={c} />}{" "}
      {tab === "Subscription" && <SubscriptionsPage controller={c} />}{" "}
      {tab === "Users" && (
        <Panel title="Company administrators">
          <p>
            Fictional metadata only; no account invitations or authentication
            are created.
          </p>
          {o.admins.map((a, i) => (
            <p key={i}>
              {a.name} · {a.role}
            </p>
          ))}
          <button onClick={() => c.navigate("Users")}>
            Manage company administrators
          </button>
        </Panel>
      )}{" "}
      {tab === "Branding" && (
        <Panel title="Company appearance">
          <p>
            {o.workspaceConfig?.welcomeText || "Industry welcome template"} ·
            Accent {o.color}
          </p>
          {o.logo && (
            <img src={o.logo} alt="Company logo" style={{ maxWidth: 120 }} />
          )}
          <button onClick={() => c.navigate("Branding Templates")}>
            Open branding editor
          </button>
        </Panel>
      )}{" "}
      {tab === "Support" && (
        <Panel title="Customer support history">
          {c.tickets
            .filter((t) => t.orgId === o.id)
            .map((t) => (
              <button
                className="owner-row"
                key={t.id}
                onClick={() => {
                  c.setTicketId(t.id);
                  c.navigate("Support");
                }}
              >
                {t.subject} · {t.priority} · {t.status}
              </button>
            ))}
        </Panel>
      )}{" "}
      {tab === "Activity" && (
        <Panel title="Configuration history">
          {c.logs
            .filter((l) => l.orgId === o.id)
            .map((l) => (
              <p key={l.id}>
                <small>
                  {l.time} · {l.actorName || "Fictional operator"}
                </small>
                <br />
                {l.event}
              </p>
            ))}
          {(o.workspaceConfig?.activity || []).map((a) => (
            <p key={a.id}>
              {a.at} · {a.actorName} · {a.action}
            </p>
          ))}
          <p>Current session history, not a tamper-proof audit.</p>
        </Panel>
      )}
    </div>
  );
}
