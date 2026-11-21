import React from "react";
import { ownerRoles, ownerPageAllowed } from "./rules";
export default function OwnerAccess() {
  return (
    <div>
      <h2>Owner role previews</h2>
      <p>
        Use the Simulated owner role selector to preview restrictions. These are
        temporary UI/workflow rules, not authentication or production
        authorization.
      </p>
      <div className="purpose-grid">
        {ownerRoles.map((r) => (
          <article className="purpose-card" key={r}>
            <h3>{r}</h3>
            <p>
              {[
                "Organisations",
                "Modules",
                "Subscriptions",
                "Support",
                "Sales Leads",
                "Settings",
              ]
                .filter((p) => ownerPageAllowed(r, p))
                .join(", ")}
            </p>
            <p>
              {r === "Read-only Auditor"
                ? "Writes are blocked."
                : "Only permitted actions are available."}
            </p>
          </article>
        ))}
      </div>
      <p>
        Real platform owner accounts and secure account administration remain in
        the existing private server foundation, not this public demo.
      </p>
    </div>
  );
}
