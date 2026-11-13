import React, { useState } from "react";
import { Empty } from "./components";
import { moduleInfo, isTaskModule } from "./customerModules";
import {
  buildReport,
  reportDate,
  reportStatus,
  reportPerson,
  metricOptions,
  previousPeriod,
  reportFields,
  reportCsv,
} from "./reportingRules";
const clean = (source) => ({
  source,
  metric:
    {
      timesheets: "hours",
      finance: "invoiceTotal",
      visitors: "visitors",
      inventory: "quantity",
      donations: "amount",
    }[moduleInfo(source).type] || "count",
  group:
    moduleInfo(source).type === "people"
      ? "department"
      : moduleInfo(source).type === "assets"
        ? "category"
        : "status",
  calculation: "total",
  from: "",
  to: "",
  staff: "",
  department: "",
  location: "",
  status: "",
  category: "",
  fields: ["title", "date", "status", "staff", "value"],
});
export default function ReportingWorkspace({
  org,
  records,
  onAdd,
  onNavigate,
  canCreate,
  canExport,
}) {
  const sources = org.modules.filter(
    (m) => !["reporting"].includes(moduleInfo(m).type),
  );
  const [config, setConfig] = useState(() =>
    clean(
      sources.find((m) => moduleInfo(m).type === "maintenance") ||
        sources[0] ||
        "",
    ),
  );
  const [name, setName] = useState(""),
    [notice, setNotice] = useState(""),
    [selectedGroup, setSelectedGroup] = useState("");
  const all = records.filter((r) => r.orgId === org.id),
    sourceRows = all.filter(
      (r) =>
        r.module === config.source && r.recordType !== "inspection-template",
    ),
    people = all.filter((r) => moduleInfo(r.module).type === "people");
  const reportModule = org.modules.find(
    (m) => moduleInfo(m).type === "reporting",
  );
  const saved = all.filter(
    (r) => r.recordType === "report-config" && r.module === reportModule,
  );
  const options = metricOptions(moduleInfo(config.source).type),
    metric = options.find((m) => m.id === config.metric) || options[0];
  const invalidDates = config.from && config.to && config.from > config.to;
  const result = buildReport(records, org.id, config),
    previous = previousPeriod(config),
    comparison = previous ? buildReport(records, org.id, previous) : null;
  const update = (patch) => {
    setConfig({ ...config, ...patch });
    setSelectedGroup("");
  };
  const format = (n) =>
    metric.unit === "GBP"
      ? "£" +
        n.toLocaleString("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : n.toLocaleString("en-GB", { maximumFractionDigits: 2 }) +
        " " +
        metric.unit;
  const download = () => {
    if (!canExport || invalidDates) return;
    const url = URL.createObjectURL(
      new Blob([reportCsv({ ...result, accepted: rows }, config, records)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "channel-report.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = async (e) => {
    e.preventDefault();
    if (!name.trim() || invalidDates || !config.source) return;
    const ok = await onAdd({
      orgId: org.id,
      module: reportModule,
      recordType: "report-config",
      title: name.trim(),
      config: structuredClone(config),
      status: "Complete",
      createdAt: new Date().toISOString(),
    });
    if (ok) {
      setNotice("Report configuration saved for this fictional company.");
      setName("");
    }
  };
  const groups = result.groups,
    maximum = Math.max(1, ...groups.map((g) => Math.abs(g.value))),
    group = groups.find((g) => g.label === selectedGroup);
  const rows = group
    ? result.accepted.filter((r) => group.ids.includes(r.record.id))
    : result.accepted;
  const select = (label, key, values) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={config[key]}
        onChange={(e) => update({ [key]: e.target.value })}
      >
        <option value="">All</option>
        {values.map((v) => (
          <option key={v.value ?? v} value={v.value ?? v}>
            {v.label ?? v}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="report-workspace">
      <div className="ops-banner">
        <div>
          <span className="eyebrow">OPERATIONAL REPORTING</span>
          <h2>Reports & analysis</h2>
          <p>Explore the current fictional records behind each result.</p>
        </div>
        <div className="quick-actions">
          <button
            disabled={!canExport || Boolean(invalidDates)}
            onClick={download}
          >
            Export report CSV
          </button>
          <button
            disabled={!canExport || Boolean(invalidDates)}
            onClick={() => window.print()}
          >
            Print report / PDF
          </button>
        </div>
      </div>
      <div className="report-design">
        <section className="report-controls">
          <h3>Build your report</h3>
          <label>
            Source module
            <select
              aria-label="Report source module"
              value={config.source}
              onChange={(e) => setConfig(clean(e.target.value))}
            >
              {sources.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              Measure
              <select
                aria-label="Report measure"
                value={config.metric}
                onChange={(e) =>
                  update({ metric: e.target.value, calculation: "total" })
                }
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Calculation
              <select
                aria-label="Report calculation"
                value={config.calculation}
                onChange={(e) => update({ calculation: e.target.value })}
              >
                <option value="total">
                  {config.metric === "count" ? "Count" : "Total"}
                </option>
                {config.metric !== "count" && (
                  <option value="average">Average per eligible record</option>
                )}
              </select>
            </label>
          </div>
          <label>
            Group by
            <select
              aria-label="Report grouping"
              value={config.group}
              onChange={(e) => update({ group: e.target.value })}
            >
              {[
                "status",
                "staff",
                "department",
                "location",
                "date",
                "category",
              ].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              From date
              <input
                aria-label="Report from date"
                type="date"
                value={config.from}
                onChange={(e) => update({ from: e.target.value })}
              />
            </label>
            <label>
              To date
              <input
                aria-label="Report to date"
                type="date"
                value={config.to}
                onChange={(e) => update({ to: e.target.value })}
              />
            </label>
          </div>
          <p className="report-hint">
            Dates use session start, operational/visitor date, financial
            creation date, then due/created date. They do not reconstruct
            historic stock balances.
          </p>
          <details>
            <summary>People, location and status filters</summary>
            {select(
              "Report staff",
              "staff",
              people.map((p) => ({ value: p.id, label: p.title })),
            )}
            {select("Report department", "department", [
              ...new Set(
                people.map((p) => p.team || p.department).filter(Boolean),
              ),
            ])}
            {select("Report location", "location", [
              ...new Set(sourceRows.map((r) => r.location).filter(Boolean)),
            ])}
            {select("Report status", "status", [
              ...new Set(sourceRows.map(reportStatus)),
            ])}
            {select("Report category", "category", [
              ...new Set(
                sourceRows.map(
                  (r) =>
                    r.category ||
                    r.condition ||
                    r.result ||
                    r.recordType ||
                    "Not recorded",
                ),
              ),
            ])}
          </details>
          <details>
            <summary>Visible and exported fields</summary>
            {Object.entries(reportFields).map(([id, label]) => (
              <label key={id} className="task-check">
                <input
                  type="checkbox"
                  checked={config.fields.includes(id)}
                  disabled={
                    config.fields.length === 1 && config.fields.includes(id)
                  }
                  onChange={(e) =>
                    update({
                      fields: e.target.checked
                        ? [...config.fields, id]
                        : config.fields.filter((f) => f !== id),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </details>
          <button
            onClick={() => {
              setConfig(clean(config.source));
              setSelectedGroup("");
            }}
          >
            Reset report filters
          </button>
        </section>
        <section className="report-results" aria-label="Report results">
          {invalidDates ? (
            <p role="alert">The end date must be on or after the start date.</p>
          ) : (
            <>
              <header>
                <div>
                  <small>
                    {config.source} · {metric.label}
                  </small>
                  <h3>{format(result.total)}</h3>
                  <p>
                    {config.from || "All dates"} — {config.to || "All dates"}
                  </p>
                  <p>
                    {result.accepted.length} contributing records ·{" "}
                    {result.excluded} excluded for unavailable numeric data ·{" "}
                    {result.undated} undated records
                  </p>
                </div>
                {comparison && (
                  <div className="report-comparison">
                    <small>
                      Previous {previous.from} — {previous.to}
                    </small>
                    <strong>{format(comparison.total)}</strong>
                    <span>
                      Change {format(result.total - comparison.total)}
                    </span>
                  </div>
                )}
              </header>
              {result.accepted.length ? (
                <div className="report-bars" aria-label="Grouped report chart">
                  {groups.map((g) => (
                    <button
                      className={selectedGroup === g.label ? "selected" : ""}
                      key={g.label}
                      onClick={() =>
                        setSelectedGroup(
                          selectedGroup === g.label ? "" : g.label,
                        )
                      }
                    >
                      <span>{g.label}</span>
                      <span className="report-bar-track">
                        <span
                          style={{
                            width: (100 * Math.abs(g.value)) / maximum + "%",
                          }}
                        />
                      </span>
                      <strong>{format(g.value)}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty>No eligible records match these filters.</Empty>
              )}
              {group && (
                <button onClick={() => setSelectedGroup("")}>
                  Show all report records
                </button>
              )}
              <h3>
                {group
                  ? "Records in " + group.label
                  : "Records behind the report"}
              </h3>
              <div className="report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {config.fields.map((f) => (
                        <th key={f}>{reportFields[f]}</th>
                      ))}
                      <th>Record link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ record: r, value }) => {
                      const person = reportPerson(r, records);
                      const fields = {
                        title: r.title,
                        date: reportDate(r) || "Undated",
                        status: reportStatus(r),
                        staff:
                          person?.title || r.person || r.owner || "Unassigned",
                        department: r.team || person?.team || "Not recorded",
                        location: r.location || "Not recorded",
                        value: format(value),
                      };
                      return (
                        <tr key={r.id}>
                          {config.fields.map((f) => (
                            <td key={f}>{fields[f]}</td>
                          ))}
                          <td>
                            <button
                              onClick={() =>
                                onNavigate(
                                  isTaskModule(r.module)
                                    ? "Tasks & projects"
                                    : r.module,
                                  { recordId: r.id },
                                )
                              }
                            >
                              Open record
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {config.metric === "hours" && (
                <p className="report-hint">
                  Open sessions are excluded. Overtime policies and payroll are
                  not calculated by this report.
                </p>
              )}
              {config.metric === "count" && (
                <p className="report-hint">
                  Counts describe the selected record set, not utilisation or
                  productivity.
                </p>
              )}
            </>
          )}
        </section>
      </div>
      <section className="report-saved">
        <h3>Saved report configurations</h3>
        {canCreate && reportModule && (
          <form onSubmit={save}>
            <label>
              Report configuration name
              <input
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <button disabled={Boolean(invalidDates) || !config.source}>
              Save report configuration
            </button>
          </form>
        )}
        {notice && <p role="status">{notice}</p>}
        <div className="quick-actions">
          {saved.map((r) => (
            <button
              key={r.id}
              disabled={!sources.includes(r.config.source)}
              title={
                !sources.includes(r.config.source)
                  ? "Source module is not available to this role"
                  : "Open saved configuration"
              }
              onClick={() => {
                setConfig(structuredClone(r.config));
                setSelectedGroup("");
                setNotice("Opened " + r.title);
              }}
            >
              {r.title}
            </button>
          ))}
        </div>
        {!saved.length && <Empty>No configurations saved yet.</Empty>}
      </section>
      <p className="module-disclaimer">
        Fictional, permission-filtered session data. CSV and browser print/PDF
        are available; native Excel and scheduled delivery are unavailable. No
        report runs after this demo closes.
      </p>
    </div>
  );
}
