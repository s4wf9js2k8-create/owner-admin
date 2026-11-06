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
    [adding, setAdding] = useState(false);
  const current = org.modules.includes(page) ? page : "Dashboard";
  const all = visibleRecords(records, org),
    rows = visibleRecords(
      records,
      org,
      current === "Dashboard" || current === "Reporting" ? null : current,
      query,
    );
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
            {all
              .filter((r) => r.status !== "Complete")
              .slice(0, 5)
              .map((r) => (
                <div className="ticket" key={r.id}>
                  <span>
                    {r.title} <small>· {r.module}</small>
                  </span>
                  <button onClick={() => setPage(r.module)}>Open module</button>
                </div>
              ))}
          </Panel>
        </>
      ) : current === "Reporting" ? (
        <Panel title="Current demo record summary">
          <p>
            Counts reflect this organisation’s enabled modules and session
            changes.
          </p>
          <Table headings={["Module", "Records", "Complete"]}>
            {org.modules
              .filter((m) => m !== "Reporting")
              .map((m) => (
                <tr key={m}>
                  <th scope="row">{m}</th>
                  <td>{all.filter((r) => r.module === m).length}</td>
                  <td>
                    {
                      all.filter(
                        (r) => r.module === m && r.status === "Complete",
                      ).length
                    }
                  </td>
                </tr>
              ))}
          </Table>
          <button onClick={() => window.print()}>Print report</button>
        </Panel>
      ) : (
        <Panel title={current}>
          <div className="toolbar">
            <input
              aria-label="Search module records"
              placeholder="Search records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={() => setAdding(true)}>Add sample record</button>
          </div>
          {rows.length ? (
            <Table headings={["Record", "Details", "Progress"]}>
              {rows.map((r) => (
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
            <Empty />
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
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onAdd({
                orgId: org.id,
                module: current,
                title: f.get("title").trim(),
                detail: f.get("detail").trim(),
                status: "Planned",
              });
              setAdding(false);
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
