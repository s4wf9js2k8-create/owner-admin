import React from "react";
import { sectors } from "../model";
import { Panel } from "../components";
import { OrganisationRows } from "./shared";
export default function OrganisationsPage({ controller }) {
  const {
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    orgs,
    profile,
    flags,
    preview,
  } = controller;
  return (
    <>
      <div className="toolbar">
        <input
          aria-label="Search organisations"
          placeholder="Search name or sector"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filter organisation status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {["All", "Trial", "Active", "Suspended", "Archived"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <Panel title="All organisations">
        <OrganisationRows
          orgs={orgs.filter(
            (o) =>
              (o.name + " " + sectors[o.sector].label)
                .toLowerCase()
                .includes(query.toLowerCase()) &&
              (statusFilter === "All" || o.status === statusFilter),
          )}
          profile={profile}
          preview={flags.customerPreview ? preview : null}
        />
      </Panel>
    </>
  );
}
