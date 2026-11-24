import React, { useEffect, useState } from "react";
import { moduleInfo } from "../customerModules";
export default function AttendanceExpectations({ org, records, onNavigate }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);
  const day = now.toISOString().slice(0, 10),
    all = records.filter((r) => r.orgId === org.id),
    people = all.filter((r) => moduleInfo(r.module).type === "people"),
    sessions = all.filter(
      (r) =>
        moduleInfo(r.module).type === "timesheets" && r.startTime && !r.endTime,
    ),
    shifts = all.filter(
      (r) =>
        moduleInfo(r.module).type === "schedule" &&
        r.startTime?.slice(0, 10) === day &&
        !["Cancelled", "Complete"].includes(r.status),
    );
  return (
    <section className="completion-workspace">
      <h3>Today's attendance expectations</h3>
      <div className="purpose-grid">
        <article className="purpose-card">
          <h4>Expected from the rota</h4>
          {shifts.map((s) => {
            const p = people.find(
                (p) =>
                  p.id === s.personId || (!s.personId && p.title === s.person),
              ),
              present = sessions.some(
                (x) =>
                  x.personId === p?.id ||
                  (!x.personId && x.person === p?.title),
              );
            return (
              <p key={s.id}>
                <button
                  onClick={() => onNavigate(s.module, { recordId: s.id })}
                >
                  {p?.title || "Unfilled shift"}
                </button>{" "}
                · {s.startTime.slice(11)} ·{" "}
                {s.location || "Location not recorded"} ·{" "}
                {present
                  ? "On site"
                  : s.startTime < now.toISOString().slice(0, 16)
                    ? "Expected — not clocked in"
                    : "Upcoming"}
              </p>
            );
          })}
          {!shifts.length && (
            <p>No staff scheduled today. Open the rota to plan coverage.</p>
          )}
        </article>
        <article className="purpose-card">
          <h4>Clock-out review</h4>
          {sessions.map((s) => (
            <p key={s.id}>
              <button onClick={() => onNavigate(s.module, { recordId: s.id })}>
                {people.find((p) => p.id === s.personId)?.title || s.person}
              </button>{" "}
              ·{" "}
              {Math.max(0, (now - Date.parse(s.startTime)) / 3600000).toFixed(
                2,
              )}{" "}
              hours · {s.location || "Location not recorded"}
              {s.startTime.slice(0, 10) < day
                ? " · Missing clock-out — began on a previous day"
                : ""}
            </p>
          ))}
          {!sessions.length && <p>No open sessions to review.</p>}
        </article>
      </div>
    </section>
  );
}
