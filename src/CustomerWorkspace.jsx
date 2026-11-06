import React, { useState } from "react";
import { visibleRecords } from "./model";
import { Panel, Table, Empty, Modal } from "./components";
export default function CustomerWorkspace({
  org,
  records,
  onUpdate,
  onAdd,
  page,
  setPage,
}) {
  const [query, setQuery] = useState(""),
    [adding, setAdding] = useState(false),
    [statusFilter, setStatusFilter] = useState("All"),
    [sortBy, setSortBy] = useState("title");
  const current = org.modules.includes(page) ? page : "Dashboard";
  const all = visibleRecords(records, org),
    rows = visibleRecords(
      records,
      org,
      current === "Dashboard" || current === "Reporting" ? null : current,
      query,
    );
  const open = all.filter((r) => r.status !== "Complete");
  const complete = all.filter((r) => r.status === "Complete");
  const completion = all.length ? Math.round((complete.length / all.length) * 100) : 0;
  const filtered = rows.filter((r) => statusFilter === "All" || r.status === statusFilter)
    .sort((a, b) => sortBy === "status" ? a.status.localeCompare(b.status) || a.title.localeCompare(b.title) : a.title.localeCompare(b.title));
  const moduleHelp = {
    Tasks: "Track operational work through planning, delivery and completion. Assignment and due dates are not yet supported.",
    Attendance: "View sample attendance records. Clock-in, approval and timesheet calculations are not yet implemented.",
    Maintenance: "Track sample maintenance jobs. Asset registers, inspection sign-off and scheduled servicing are not yet implemented.",
    Documents: "Track sample document records. File versioning and approvals are not yet implemented.",
    Events: "Track sample events. Scheduling, staffing and capacity management are not yet implemented.",
  };
  return (
    <>
      <div className="heading">
        <div>
          <small>{org.name} · Customer demonstration</small>
          <h1>{current}</h1>
          <p>Shared application · {org.modules.length} enabled modules</p>
        </div>
      </div>
      {current === "Dashboard" ? (
        <>
          <div className="cards">
            {[
              ["Enabled modules", org.modules.length],
              ["Operational records", all.length],
              [
                "In progress",
                all.filter((r) => r.status === "In progress").length,
              ],
              ["Completed", all.filter((r) => r.status === "Complete").length],
            ].map(([k, v]) => (
              <article key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </article>
            ))}
          </div>
          <Panel title="Operational snapshot">
            <p>{open.length} outstanding records across {org.modules.filter((m) => m !== "Reporting").length} operational modules · {completion}% complete.</p>
            <progress value={completion} max="100" aria-label="Overall completion percentage" style={{width:"100%"}} />
            {open.length === 0 && <p>Nothing currently needs attention in this fictional workspace.</p>}
          </Panel>
          <Panel title="Your workspace">
            <div className="quick-actions">
              {org.modules.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPage(m);
                    setQuery("");
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Daily attention list">
            {open
              .slice(0, 5)
              .map((r) => (
                <div className="ticket" key={r.id}>
                  <span>
                    {r.title} <small>· {r.module}</small>
                  </span>
                  <button onClick={() => setPage(r.module)}>Open module</button>
                </div>
              ))}
            {open.length > 5 && <p className="muted">Showing the first five outstanding records. Open a module for the full list.</p>}
          </Panel>
        </>
      ) : current === "Reporting" ? (
        <Panel title="Current demo record summary">
          <p>
            Counts reflect this organisation’s enabled modules and session
            changes.
          </p>
          <div className="cards"><article><small>Total records</small><strong>{all.length}</strong></article><article><small>Outstanding</small><strong>{open.length}</strong></article><article><small>Completion rate</small><strong>{completion}%</strong></article></div>
          <Table headings={["Module", "Records", "Outstanding", "Complete", "Completion rate"]}>
            {org.modules
              .filter((m) => m !== "Reporting")
              .map((m) => (
                <tr key={m}>
                  <th scope="row">{m}</th>
                  <td>{all.filter((r) => r.module === m).length}</td>
                  <td>{all.filter((r) => r.module === m && r.status !== "Complete").length}</td>
                  <td>{all.filter((r) => r.module === m && r.status === "Complete").length}</td>
                  <td>{all.some((r) => r.module === m) ? Math.round(100 * all.filter((r) => r.module === m && r.status === "Complete").length / all.filter((r) => r.module === m).length) + "%" : "—"}</td>
                </tr>
              ))}
          </Table>
          <button onClick={() => window.print()}>Print report</button>
        </Panel>
      ) : (
        <Panel title={current}>
          <p className="muted">{moduleHelp[current] || "Manage fictional records for this module. Specialist workflows are still in development."}</p>
          <div className="cards"><article><small>Records</small><strong>{all.filter(r => r.module === current).length}</strong></article><article><small>Outstanding</small><strong>{all.filter(r => r.module === current && r.status !== "Complete").length}</strong></article><article><small>Completed</small><strong>{all.filter(r => r.module === current && r.status === "Complete").length}</strong></article></div>
          <div className="toolbar">
            <input
              aria-label="Search module records"
              placeholder="Search records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label>Status <select aria-label="Filter records by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{["All", "Planned", "In progress", "Complete"].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Sort <select aria-label="Sort module records" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="title">Title</option><option value="status">Status</option></select></label>
            <button onClick={() => setAdding(true)}>Add sample record</button>
          </div>
          <p role="status">Showing {filtered.length} of {all.filter(r => r.module === current).length} records</p>
          {filtered.length ? (
            <Table headings={["Record", "Details", "Progress"]}>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.title}</th>
                  <td>{r.detail}</td>
                  <td>
                    <select
                      aria-label={"Progress for " + r.title}
                      value={r.status}
                      onChange={(e) =>
                        onUpdate(org.id, r.id, { status: e.target.value })
                      }
                    >
                      {["Planned", "In progress", "Complete"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty>No records match these filters. Try another status or search term.</Empty>
          )}
          <p className="muted">
            Progress is a generic demonstration workflow. Attendance approval,
            financial reconciliation and inspection sign-off are future domain
            workflows.
          </p>
        </Panel>
      )}
      {adding && (
        <Modal
          title={"Add sample " + current + " record"}
          onClose={() => setAdding(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const saved = await onAdd({
                orgId: org.id,
                module: current,
                title: f.get("title").trim(),
                detail: f.get("detail").trim(),
                status: "Planned",
              });
              if (saved) setAdding(false);
            }}
          >
            <p>Use fictional operational details only.</p>
            <label>
              Record title
              <input
                name="title"
                required
                maxLength={100}
                pattern=".*\S.*"
                autoFocus
              />
            </label>
            <label>
              Details
              <input name="detail" required maxLength={150} pattern=".*\S.*" />
            </label>
            <button type="submit" className="primary">
              Save sample record
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
