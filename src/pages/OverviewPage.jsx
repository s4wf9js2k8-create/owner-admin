import React from "react";
import { Panel, Status } from "../components";
import { OrganisationRows, Activity } from "./shared";
export default function OverviewPage({ controller }) {
  const { orgs, tickets, navigate, flags, preview, profile, logs } = controller;
  return (
    <>
      <div className="cards">
        {[
          ["Organisations", orgs.filter((o) => o.status !== "Archived").length],
          [
            "Active subscriptions",
            orgs.filter((o) => o.status === "Active").length,
          ],
          ["Enabled modules", orgs.reduce((n, o) => n + o.modules.length, 0)],
          [
            "Open support tickets",
            tickets.filter((t) => t.status !== "Closed").length,
          ],
        ].map(([k, v]) => (
          <article key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </article>
        ))}
      </div>
      <div className="two-column">
        <Panel title="Needs attention">
          <p>
            <Status>Trial</Status>{" "}
            {orgs.filter((o) => o.status === "Trial").length} organisations in
            trial
          </p>
          <p>
            <Status>High</Status>{" "}
            {
              tickets.filter(
                (t) => t.priority === "High" && t.status !== "Closed",
              ).length
            }{" "}
            high-priority tickets
          </p>
          <p>
            Production readiness: authentication, isolation and backups pending.
          </p>
          <button onClick={() => navigate("Support")}>Review support</button>
        </Panel>
        <Panel title="Quick management">
          <div className="quick-actions">
            {["Organisations", "Modules", "Subscriptions", "Activity Logs"].map(
              (n) => (
                <button key={n} onClick={() => navigate(n)}>
                  {n}
                </button>
              ),
            )}
          </div>
          <p>Explore four sectors using the same customer application.</p>
          <button
            disabled={
              !flags.customerPreview ||
              !orgs.some((o) => o.status !== "Archived")
            }
            onClick={() =>
              preview(orgs.find((o) => o.status !== "Archived")?.id)
            }
          >
            Explore customer workspace
          </button>
        </Panel>
      </div>
      <Panel title="Organisation directory">
        <OrganisationRows
          orgs={orgs.slice(0, 4)}
          profile={profile}
          preview={flags.customerPreview ? preview : null}
        />
      </Panel>
      <Activity logs={logs.slice(0, 5)} />
    </>
  );
}
