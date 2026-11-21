import React from "react";
import { sectors } from "../model";
import { Status } from "../components";
export default function CompanyDirectory({ controller: c }) {
  return (
    <>
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">CUSTOMER COMPANIES</span>
          <h2>Company directory</h2>
          <p>
            Configuration, subscriptions and support for each fictional
            customer.
          </p>
        </div>
        <button onClick={() => c.navigate("Onboarding")}>
          Begin company onboarding
        </button>
      </div>
      <div className="customer-tools">
        <label>
          Find company
          <input
            aria-label="Search organisations"
            value={c.query}
            onChange={(e) => c.setQuery(e.target.value)}
          />
        </label>
        <label>
          Account status
          <select
            aria-label="Filter organisation status"
            value={c.statusFilter}
            onChange={(e) => c.setStatusFilter(e.target.value)}
          >
            {["All", "Trial", "Active", "Suspended", "Archived"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {!c.orgs.some(
        (o) =>
          (o.name + " " + sectors[o.sector].label)
            .toLowerCase()
            .includes(c.query.toLowerCase()) &&
          (c.statusFilter === "All" || o.status === c.statusFilter),
      ) && <p>No organisations match your search.</p>}
      <div className="owner-company-directory">
        {c.orgs
          .filter(
            (o) =>
              (o.name + " " + sectors[o.sector].label)
                .toLowerCase()
                .includes(c.query.toLowerCase()) &&
              (c.statusFilter === "All" || o.status === c.statusFilter),
          )
          .map((o) => (
            <article className="owner-company-entry" key={o.id}>
              <div>
                <small>{o.industry || sectors[o.sector].label}</small>
                <h3>{o.name}</h3>
                <p>
                  <Status>{o.status}</Status> · {o.plan} · {o.cycle}
                </p>
                <p>
                  {o.contactPerson ||
                    o.admins[0]?.name ||
                    "Primary contact not recorded"}{" "}
                  · {o.contactEmail || "Email not recorded"}
                </p>
                <small>
                  {o.modules.length} enabled modules ·{" "}
                  {
                    c.tickets.filter(
                      (t) => t.orgId === o.id && t.status !== "Closed",
                    ).length
                  }{" "}
                  unresolved tickets ·{" "}
                  {o.onboardingComplete
                    ? "Onboarding configured"
                    : "Configuration to review"}
                </small>
              </div>
              <div>
                <button onClick={() => c.profile(o.id)}>Profile</button>
                {c.flags.customerPreview && o.status !== "Archived" && (
                  <button onClick={() => c.preview(o.id)}>Preview</button>
                )}
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
