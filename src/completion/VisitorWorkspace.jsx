import { visitorSummary } from "./metrics";
import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
import { eventAttendance } from "../scheduling/rules";
import { exportCsv } from "./Shared";
const day = () => new Date().toISOString().slice(0, 10);
export default function VisitorWorkspace({
  org,
  module,
  records,
  onAdd,
  canCreate,
  canExport,
  onNavigate,
}) {
  const rows = records.filter((r) => r.orgId === org.id && r.module === module),
    events = records.filter(
      (r) =>
        r.orgId === org.id &&
        moduleInfo(r.module).type === "events" &&
        r.recordType !== "booking",
    );
  const [from, setFrom] = useState(day().slice(0, 7) + "-01"),
    [to, setTo] = useState(day()),
    [category, setCategory] = useState("All"),
    [message, setMessage] = useState("");
  const result = visitorSummary(rows, from, to, category),
    span = Math.max(
      1,
      Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1,
    ),
    before = new Date(Date.parse(from) - 86400000).toISOString().slice(0, 10),
    previous = visitorSummary(
      rows,
      new Date(Date.parse(from) - span * 86400000).toISOString().slice(0, 10),
      before,
      category,
    ),
    max = Math.max(1, ...result.dates.map((d) => d[1]));
  return (
    <div className="completion-workspace visitor-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">VISITOR ANALYSIS</span>
          <h2>Visitor statistics</h2>
          <p>
            Counts recorded by staff, category breakdowns and linked event
            attendance. Event check-ins are shown separately to avoid double
            counting.
          </p>
        </div>
      </div>
      <div className="form-pair">
        <label>
          Visitor period from
          <input
            type="date"
            required
            value={from}
            max={to}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
          />
        </label>
        <label>
          Visitor period to
          <input
            type="date"
            required
            min={from}
            value={to}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
        </label>
        <label>
          Visitor category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "All",
              ...new Set([
                "General",
                "Adult",
                "Child",
                "Group",
                "Member",
                ...rows.map((r) => r.category || "General"),
              ]),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {from > to && (
        <p role="alert">Choose an end date on or after the start date.</p>
      )}
      <section className="visitor-total">
        <h3>{result.total.toLocaleString("en-GB")} recorded visitors</h3>
        <p>
          Previous {span} days: {previous.total} · Change{" "}
          {result.total - previous.total >= 0 ? "+" : ""}
          {result.total - previous.total}
        </p>
      </section>
      <div
        className="visitor-bars"
        role="img"
        aria-label="Daily visitor counts"
      >
        {result.dates.map(([date, n]) => (
          <div key={date}>
            <time>{date}</time>
            <meter min="0" max={max} value={n} />
            <strong>{n}</strong>
          </div>
        ))}
        {!result.dates.length && (
          <p>
            No visitor counts in this period. Record figures or choose another
            date range.
          </p>
        )}
      </div>
      <div className="purpose-grid">
        {result.categories.map(([name, count]) => (
          <article className="purpose-card" key={name}>
            <h3>{name}</h3>
            <p>
              {count} visitors ·{" "}
              {result.total ? Math.round((count / result.total) * 100) : 0}%
            </p>
          </article>
        ))}
      </div>
      {canExport && (
        <button
          onClick={() =>
            exportCsv("visitor-counts", [
              ["Date", "Category", "Count", "Location"],
              ...result.rows.map((r) => [
                r.date,
                r.category || "General",
                r.count,
                r.location || "",
              ]),
            ])
          }
        >
          Export visitor CSV
        </button>
      )}
      <h3>Event attendance in selected period</h3>
      {events
        .filter(
          (e) =>
            e.startTime?.slice(0, 10) >= from &&
            e.startTime?.slice(0, 10) <= to,
        )
        .map((e) => (
          <p key={e.id}>
            <button onClick={() => onNavigate(e.module, { recordId: e.id })}>
              {e.title}
            </button>{" "}
            · {eventAttendance(records, e.id)} checked in / {e.capacity || 0}{" "}
            capacity
          </p>
        ))}
      {canCreate && (
        <details>
          <summary>Record visitor figures</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = Object.fromEntries(new FormData(form));
              if (
                await onAdd({
                  ...f,
                  orgId: org.id,
                  module,
                  title: f.date + " · " + f.category,
                  count: Number(f.count),
                  status: "Complete",
                  recordType: "visitor-count",
                  dueDate: f.date,
                })
              ) {
                setMessage(
                  "Visitor figures saved. Charts and reporting updated.",
                );
                form.reset();
              }
            }}
          >
            <div className="form-pair">
              <label>
                Count date
                <input type="date" name="date" required defaultValue={day()} />
              </label>
              <label>
                Count category
                <select name="category">
                  {["General", "Adult", "Child", "Group", "Member"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Visitor count
                <input
                  type="number"
                  name="count"
                  min="0"
                  max="1000000"
                  step="1"
                  required
                />
              </label>
              <label>
                Count location
                <select name="location">
                  {(
                    org.workspaceConfig?.operations?.locations || ["Main site"]
                  ).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
            <button>Save visitor figures</button>
          </form>
        </details>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
