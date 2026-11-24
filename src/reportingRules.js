import { moduleInfo } from "./customerModules.js";
import {
  documentKind,
  totalPence,
  balancePence,
  financialStatus,
} from "./financialRules.js";
const reportSubject = (record, records = []) =>
  record.recordType === "booking" && record.eventId
    ? records.find(
        (r) =>
          r.id === record.eventId &&
          r.orgId === record.orgId &&
          moduleInfo(r.module).type === "events" &&
          r.recordType !== "booking",
      ) || record
    : record;
const assignmentIds = (record) =>
  [
    record.personId,
    record.ownerId,
    record.engineerId,
    record.inspectorId,
    record.custodianId,
    ...(record.staffIds || []),
  ].filter(Boolean);
const reportAssignmentIds = (record, records) => [
  ...new Set([
    ...assignmentIds(record),
    ...assignmentIds(reportSubject(record, records)),
  ]),
];
export const reportLocation = (record, records = []) =>
  reportSubject(record, records).location || record.location || "";
export const reportDate = (record, records = []) => {
  const r = reportSubject(record, records);
  return String(
    r.startTime ||
      record.startTime ||
      record.operationDate ||
      record.date ||
      record.creationDate ||
      record.dueDate ||
      record.createdAt ||
      "",
  ).slice(0, 10);
};
export function reportStatus(r) {
  const type = moduleInfo(r.module).type;
  if (r.recordType === "booking") return r.bookingStatus || r.status;
  if (type === "finance") return financialStatus(r);
  if (type === "inspections") return r.result || r.status || "Not recorded";
  if (type === "people")
    return r.employmentStatus || r.staffStatus || "Not recorded";
  return (
    (["leave", "timesheets", "training", "documents"].includes(type)
      ? r.approval
      : r.status) ||
    r.status ||
    "Not recorded"
  );
}
export function reportPerson(record, records) {
  const subject = reportSubject(record, records);
  return (
    reportAssignmentIds(record, records)
      .map((id) =>
        records.find(
          (p) =>
            p.id === id &&
            p.orgId === record.orgId &&
            moduleInfo(p.module).type === "people",
        ),
      )
      .find(Boolean) ||
    records.find(
      (p) =>
        p.orgId === record.orgId &&
        moduleInfo(p.module).type === "people" &&
        [
          record.person,
          record.owner,
          record.inspector,
          subject.owner,
          subject.person,
        ].includes(p.title),
    )
  );
}
export const metricOptions = (type) => [
  { id: "count", label: "Record count", unit: "records" },
  ...(type === "events"
    ? [
        { id: "places", label: "Confirmed reservation places", unit: "places" },
        { id: "admissions", label: "Checked-in visitors", unit: "visitors" },
        {
          id: "bookingValue",
          label: "Fictional confirmed booking value",
          unit: "GBP",
        },
        { id: "capacity", label: "Planned event capacity", unit: "places" },
      ]
    : []),
  ...(type === "timesheets"
    ? [
        {
          id: "hours",
          label: "Completed hours (breaks deducted)",
          unit: "hours",
        },
      ]
    : []),
  ...(type === "projects"
    ? [
        { id: "progress", label: "Project task completion", unit: "%" },
        { id: "budget", label: "Project budgets", unit: "GBP" },
        { id: "cost", label: "Recorded project costs", unit: "GBP" },
        {
          id: "remainingBudget",
          label: "Project budget remaining",
          unit: "GBP",
        },
      ]
    : []),
  ...(type === "timesheets"
    ? [
        {
          id: "overtime",
          label: "Weekly overtime (configured threshold)",
          unit: "hours",
        },
      ]
    : []),
  ...(type === "finance"
    ? [
        {
          id: "invoiceTotal",
          label: "Fictional invoice face value",
          unit: "GBP",
        },
        { id: "balance", label: "Outstanding invoice balance", unit: "GBP" },
      ]
    : []),
  ...(type === "inventory"
    ? [{ id: "quantity", label: "Current stock units", unit: "units" }]
    : []),
  ...(type === "visitors"
    ? [{ id: "visitors", label: "Visitor count", unit: "visitors" }]
    : []),
  ...(type === "donations"
    ? [{ id: "amount", label: "Fictional donations", unit: "GBP" }]
    : []),
  ...(type === "maintenance"
    ? [
        { id: "labour", label: "Recorded labour", unit: "hours" },
        { id: "parts", label: "Parts issued to jobs", unit: "units" },
      ]
    : []),
];
export function reportValue(r, metric, records = []) {
  if (["progress", "budget", "cost", "remainingBudget"].includes(metric)) {
    if (r.recordType !== "project") return null;
    const tasks = records.filter(
        (x) =>
          x.orgId === r.orgId &&
          x.projectId === r.id &&
          x.recordType !== "project" &&
          moduleInfo(x.module).type === "projects",
      ),
      cost = (r.costs || []).reduce((n, c) => n + Number(c.amount || 0), 0);
    return metric === "progress"
      ? tasks.length
        ? (tasks.filter((t) => t.status === "Complete").length / tasks.length) *
          100
        : null
      : metric === "budget"
        ? Number(r.budget || 0)
        : metric === "cost"
          ? cost
          : Number(r.budget || 0) - cost;
  }
  if (metric === "count") return 1;
  if (["places", "admissions", "bookingValue"].includes(metric)) {
    if (r.recordType !== "booking") return null;
    const active = ["Confirmed", "Checked in"].includes(r.bookingStatus);
    return metric === "admissions"
      ? r.attendees?.length
        ? r.attendees.filter((a) => a.checkedInAt).length
        : r.bookingStatus === "Checked in"
          ? Number(r.guests)
          : 0
      : active
        ? Number(r.guests) *
          (metric === "bookingValue" ? Number(r.unitPrice || 0) : 1)
        : 0;
  }
  if (metric === "capacity")
    return r.recordType === "booking" ? null : Number(r.capacity || 0);
  if (metric === "hours") {
    if (!r.startTime || !r.endTime) return null;
    const minutes = (Date.parse(r.endTime) - Date.parse(r.startTime)) / 60000,
      breaks = Number(r.breakMinutes || 0);
    return Number.isFinite(minutes) &&
      Number.isFinite(breaks) &&
      minutes >= 0 &&
      breaks >= 0 &&
      breaks <= minutes
      ? (minutes - breaks) / 60
      : null;
  }
  if (
    metric === "balance" &&
    ["Draft", "Cancelled"].includes(financialStatus(r))
  )
    return null;
  if (["invoiceTotal", "balance"].includes(metric))
    return documentKind(r) === "invoice"
      ? (metric === "invoiceTotal"
          ? totalPence(r)
          : Math.max(0, balancePence(r))) / 100
      : null;
  if (metric === "labour")
    return (
      (r.workLogs || []).reduce((n, l) => n + Number(l.minutes || 0), 0) / 60
    );
  if (metric === "parts")
    return (r.partsUsed || []).reduce((n, p) => n + Number(p.qty || 0), 0);
  const field = { quantity: "quantity", visitors: "count", amount: "amount" }[
      metric
    ],
    value = Number(r[field]);
  return field && r[field] !== undefined && Number.isFinite(value)
    ? value
    : null;
}
export function buildReport(records, orgId, config) {
  const scoped = records.filter(
    (r) =>
      r.orgId === orgId &&
      ![
        "report-config",
        "inspection-template",
        "supplier",
        "purchase-order",
        "resource",
        "form-template",
        "training-session",
        "campaign",
        "product",
        "operations-template",
        "maintenance-template",
        "shift-template",
      ].includes(r.recordType),
  );
  const metric = metricOptions(moduleInfo(config.source).type).some(
    (m) => m.id === config.metric,
  )
    ? config.metric
    : "count";
  const rows = scoped
    .filter((r) => r.module === config.source)
    .filter((r) => {
      const person = reportPerson(r, records),
        date = reportDate(r, records);
      return (
        (!config.from ||
          (date &&
            (metric === "overtime"
              ? String(r.endTime || date).slice(0, 10)
              : date) >= config.from)) &&
        (!config.to || (date && date <= config.to)) &&
        (!config.staff ||
          person?.id === config.staff ||
          reportAssignmentIds(r, records).includes(config.staff)) &&
        (!config.department ||
          (r.team || person?.team || person?.department) ===
            config.department) &&
        (!config.location || reportLocation(r, records) === config.location) &&
        (!config.status || reportStatus(r) === config.status) &&
        (!config.category ||
          (r.category ||
            r.condition ||
            r.result ||
            r.recordType ||
            "Not recorded") === config.category)
      );
    });
  const overtime = new Map(),
    weekly = new Map();
  if (metric === "overtime")
    for (const row of scoped
      .filter(
        (r) =>
          moduleInfo(r.module).type === "timesheets" &&
          r.startTime &&
          r.endTime,
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))) {
      const value = reportValue(row, "hours", records);
      if (value === null) continue;
      const utc = (v) =>
        Date.parse(v.endsWith("Z") || /[+-]\d\d:\d\d$/.test(v) ? v : v + "Z");
      const from = utc(row.startTime),
        until = utc(row.endTime),
        ratio = value / ((until - from) / 3600000);
      let sum = 0;
      for (let point = from; point < until;) {
        const date = new Date(point),
          day = date.toISOString().slice(0, 10),
          next = Math.min(until, Date.parse(day + "T00:00Z") + 86400000);
        date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
        const key =
            (row.personId || row.person) +
            ":" +
            date.toISOString().slice(0, 10),
          before = weekly.get(key) || 0,
          threshold = Number(config.overtimeThreshold ?? 40),
          hours = ((next - point) / 3600000) * ratio;
        weekly.set(key, before + hours);
        if (
          (!config.from || day >= config.from) &&
          (!config.to || day <= config.to)
        )
          sum +=
            Math.max(0, before + hours - threshold) -
            Math.max(0, before - threshold);
        point = next;
      }
      overtime.set(row.id, sum);
    }
  const accepted = rows
    .map((record) => ({
      record,
      value:
        metric === "overtime"
          ? (overtime.get(record.id) ?? null)
          : reportValue(record, metric, records),
    }))
    .filter((r) => r.value !== null && Number.isFinite(r.value));
  const grouping = (r) =>
    config.group === "staff"
      ? reportPerson(r, records)?.title || r.person || r.owner || "Unassigned"
      : config.group === "department"
        ? r.team || reportPerson(r, records)?.team || "Not recorded"
        : config.group === "date"
          ? reportDate(r, records) || "Undated"
          : config.group === "location"
            ? reportLocation(r, records) || "Not recorded"
            : config.group === "category"
              ? r.category ||
                r.condition ||
                r.result ||
                r.recordType ||
                "Not recorded"
              : reportStatus(r);
  const buckets = new Map();
  for (const row of accepted) {
    const key = grouping(row.record);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }
  const calculate = (list) =>
    config.calculation === "average"
      ? list.length
        ? list.reduce((n, r) => n + r.value, 0) / list.length
        : 0
      : list.reduce((n, r) => n + r.value, 0);
  return {
    rows,
    accepted,
    excluded: rows.length - accepted.length,
    total: calculate(accepted),
    groups: [...buckets.entries()].map(([label, list]) => ({
      label,
      value: calculate(list),
      count: list.length,
      ids: list.map((r) => r.record.id),
    })),
    undated: rows.filter((r) => !reportDate(r, records)).length,
  };
}
export function previousPeriod(config) {
  if (!config.from || !config.to || config.from > config.to) return null;
  const start = Date.parse(config.from + "T00:00:00Z"),
    end = Date.parse(config.to + "T00:00:00Z"),
    duration = end - start + 86400000;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return {
    ...config,
    from: new Date(start - duration).toISOString().slice(0, 10),
    to: new Date(start - 86400000).toISOString().slice(0, 10),
  };
}
export const reportFields = {
  title: "Record",
  date: "Report date",
  status: "Status",
  staff: "Staff",
  department: "Department",
  location: "Location",
  value: "Metric value",
};
export function reportCsv(report, config, records) {
  const escape = (value) =>
    '"' +
    String(value ?? "")
      .replace(/^\s*[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const fields = (config.fields || Object.keys(reportFields)).filter(
    (f) => reportFields[f],
  );
  const lines = [
    fields.map((f) => reportFields[f]),
    ...report.accepted.map(({ record: r, value }) => {
      const person = reportPerson(r, records);
      const values = {
        title: r.title,
        date: reportDate(r, records),
        status: reportStatus(r),
        staff: person?.title || r.person || r.owner || "",
        department: r.team || person?.team || "",
        location: reportLocation(r, records),
        value: Number(value.toFixed(2)),
      };
      return fields.map((f) => values[f]);
    }),
  ];
  return "\ufeff" + lines.map((row) => row.map(escape).join(",")).join("\r\n");
}

/** Excel 2003 XML, a supported Excel format. Values stay typed data, never formulas. */
export function reportSpreadsheet(report, config, records) {
  const csv = reportCsv(report, config, records).replace(/^\uFEFF/, ""),
    lines = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(value);
      value = "";
    } else if (ch === "\r" && !quoted && csv[i + 1] === "\n") {
      row.push(value);
      lines.push(row);
      row = [];
      value = "";
      i++;
    } else value += ch;
  }
  row.push(value);
  lines.push(row);
  const esc = (v) =>
    String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  return (
    '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>' +
    lines
      .map(
        (r) =>
          "<Row>" +
          r
            .map(
              (v) =>
                '<Cell><Data ss:Type="String">' + esc(v) + "</Data></Cell>",
            )
            .join("") +
          "</Row>",
      )
      .join("") +
    "</Table></Worksheet></Workbook>"
  );
}
