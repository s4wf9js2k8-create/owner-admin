import { leaveBalances } from "./metrics";
import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
const iso = (d) => d.toISOString().slice(0, 10);
export default function LeaveCalendar({ org, records, onOpen }) {
  const [month, setMonth] = useState(iso(new Date()).slice(0, 7));
  const people = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "people",
    ),
    leave = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "leave",
    ),
    year = month.slice(0, 4),
    count = new Date(Number(year), Number(month.slice(5)), 0).getDate(),
    balances = leaveBalances(
      leave,
      people,
      year,
      Number(org.workspaceConfig?.operations?.leaveDays ?? 25),
      org.workspaceConfig?.operations?.days || [1, 2, 3, 4, 5],
    );
  return (
    <section className="completion-workspace">
      <label>
        Leave calendar month
        <input
          type="month"
          required
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
      </label>
      <div className="leave-calendar">
        {Array.from(
          { length: count },
          (_, i) => month + "-" + String(i + 1).padStart(2, "0"),
        ).map((date) => (
          <article key={date}>
            <strong>
              {new Date(date + "T12:00Z").toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
              })}
            </strong>
            {leave
              .filter(
                (r) =>
                  ["Approved", "Pending"].includes(r.approval) &&
                  r.startDate <= date &&
                  r.endDate >= date,
              )
              .map((r) => (
                <button key={r.id} onClick={() => onOpen(r.id)}>
                  {people.find((p) => p.id === r.personId)?.title || r.person} ·{" "}
                  {r.approval}
                </button>
              ))}
          </article>
        ))}
      </div>
      <details>
        <summary>{year} leave balances</summary>
        <p>
          Configured weekday allowance; overlapping approved dates counted once.
          No holiday calendar or payroll entitlement is inferred.
        </p>
        {balances.map((p) => (
          <p key={p.id}>
            <strong>{p.name}</strong> · {p.used} days approved · {p.remaining}{" "}
            days remaining
          </p>
        ))}
      </details>
    </section>
  );
}
