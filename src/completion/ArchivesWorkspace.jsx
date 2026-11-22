import React, { useEffect, useState } from "react";
import { Empty, Modal, Status } from "../components";
import { moduleInfo } from "../customerModules";
import { archiveEligibility, relatedTo } from "./rules";
import { exportCsv, History } from "./Shared";
export default function ArchivesWorkspace({
  org,
  records,
  onUpdate,
  onNavigate,
  focusId,
  canEdit = false,
  canExport = false,
}) {
  const [search, setSearch] = useState(""),
    [module, setModule] = useState("All"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [mode, setMode] = useState("Archived"),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [marked, setMarked] = useState([]);
  useEffect(() => {
    if (focusId) {
      setSelected(focusId);
      setMode("Archived");
    }
  }, [focusId]);
  const all = records.filter((r) => r.orgId === org.id),
    rows = all.filter(
      (r) =>
        (mode === "Archived"
          ? r.archivedAt
          : !r.archivedAt && archiveEligibility(r)) &&
        (module === "All" || r.module === module) &&
        (!from ||
          (r.archivedAt || r.completedAt || r.dueDate || "").slice(0, 10) >=
            from) &&
        (!to ||
          (r.archivedAt || r.completedAt || r.dueDate || "").slice(0, 10) <=
            to) &&
        [r.title, r.module, r.archiveReason]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    ),
    current = all.find((r) => r.id === selected);
  const change = async (r, kind, reason) => {
    if (await onUpdate(org.id, r.id, { _workflow: { kind, reason } })) {
      setMessage(
        kind === "restore"
          ? "Record restored without changing its original status."
          : "Record archived. Its IDs, history and linked records are retained.",
      );
      setSelected("");
    }
  };
  const download = () =>
    exportCsv("business-archive", [
      ["ID", "Module", "Record", "Status", "Archived at", "Reason"],
      ...rows
        .filter((r) => !marked.length || marked.includes(r.id))
        .map((r) => [
          r.id,
          r.module,
          r.title,
          r.status,
          r.archivedAt,
          r.archiveReason,
        ]),
    ]);
  return (
    <div className="completion-workspace archive-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">BUSINESS RECORD HISTORY</span>
          <h2>Business archives</h2>
          <p>
            Retain completed operational records separately from active work and
            historical collection objects.
          </p>
        </div>
        <div>
          {canExport && (
            <>
              <button onClick={download}>Export archive CSV</button>
              <button onClick={() => window.print()}>
                Print selected history
              </button>
            </>
          )}
        </div>
      </div>
      <div className="customer-tools">
        <label>
          Archive view
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option>Archived</option>
            <option>Eligible active records</option>
          </select>
        </label>
        <label>
          Find historical record
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Source module
          <select value={module} onChange={(e) => setModule(e.target.value)}>
            {["All", ...new Set(all.map((r) => r.module))].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          From date
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To date
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {message && <p role="status">{message}</p>}
      {from && to && from > to && (
        <p role="alert">The end date must follow the start date.</p>
      )}
      <div className="archive-catalogue">
        {rows.map((r) => (
          <article
            key={r.id}
            className={
              "archive-card " +
              (marked.length && !marked.includes(r.id) ? "print-omit" : "")
            }
          >
            <label className="task-check">
              <input
                type="checkbox"
                checked={marked.includes(r.id)}
                onChange={(e) =>
                  setMarked((old) =>
                    e.target.checked
                      ? [...old, r.id]
                      : old.filter((id) => id !== r.id),
                  )
                }
              />
              Select for export / print
            </label>
            <small>
              {r.module} · {r.archivedAt?.slice(0, 10) || "Eligible to archive"}
            </small>
            <h3>{r.title}</h3>
            <Status>{r.status || r.approval}</Status>
            <p>{r.archiveReason || "Review the record before archiving."}</p>
            <button onClick={() => setSelected(r.id)}>
              Review historical record
            </button>
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty>
          {mode === "Archived"
            ? "No archived business records match. Choose Eligible active records to retain completed work."
            : "No completed or inactive records are eligible. Finish and review the original workflow first."}
        </Empty>
      )}
      {current && (
        <Modal title="Business record history" onClose={() => setSelected("")}>
          <h3>{current.title}</h3>
          <p>
            {current.module} ·{" "}
            <Status>{current.status || current.approval}</Status>
          </p>
          <p>{current.detail || current.description || current.fault}</p>
          <dl className="completion-properties">
            {[
              "reference",
              "asset",
              "startTime",
              "endTime",
              "dueDate",
              "result",
              "completedAt",
              "archiveReason",
            ]
              .filter((k) => current[k])
              .map((k) => (
                <React.Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{String(current[k])}</dd>
                </React.Fragment>
              ))}
          </dl>
          <h3>Preserved history</h3>
          <History
            entries={[
              ...(current.history || []),
              ...(current.activity || []),
              ...(current.archiveHistory || []),
            ]}
          />
          <h3>Related records</h3>
          {all
            .filter(
              (r) =>
                r.id !== current.id &&
                (relatedTo(current, r.id) || relatedTo(r, current.id)),
            )
            .map((r) => (
              <button
                className="schedule-linked"
                key={r.id}
                onClick={() =>
                  onNavigate(
                    r.archivedAt
                      ? "Business archives"
                      : moduleInfo(r.module).type === "projects"
                        ? "Tasks & projects"
                        : r.module,
                    { recordId: r.id },
                  )
                }
              >
                {r.title} · {r.archivedAt ? "Archived" : r.module}
              </button>
            ))}
          {canEdit &&
            (current.archivedAt ? (
              <button onClick={() => change(current, "restore")}>
                Restore record
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  change(
                    current,
                    "archive",
                    String(new FormData(e.currentTarget).get("reason")).trim(),
                  );
                }}
              >
                <label>
                  Archive reason
                  <textarea name="reason" required maxLength={500} />
                </label>
                <button>Archive record</button>
              </form>
            ))}
        </Modal>
      )}
    </div>
  );
}
