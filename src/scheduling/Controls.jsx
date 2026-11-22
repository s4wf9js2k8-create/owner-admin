import React from "react";
import { eligibleStaff } from "../staffEligibility";
import { calendarDays, resourceRecords } from "./rules";
export function StaffAssignment({
  records,
  orgId,
  startTime,
  endTime,
  excludedRecordId = "",
  value = [],
  onChange,
  multiple = false,
  label = "Assigned staff",
  required = false,
  requiredQualification,
  kind = "bookings",
  disabled = false,
}) {
  const { eligible, excluded } = eligibleStaff(records, orgId, {
    kind,
    requiredQualification,
    date: startTime,
    startTime,
    endTime,
    excludedRecordId,
  });
  return (
    <div className="schedule-staff-picker">
      <label>
        {label}
        <select
          aria-label={label}
          multiple={multiple}
          required={required}
          disabled={disabled}
          value={multiple ? value : value[0] || ""}
          onChange={(e) =>
            onChange(
              Array.from(e.target.selectedOptions)
                .map((o) => o.value)
                .filter(Boolean),
            )
          }
        >
          {!multiple && <option value="">Choose available staff</option>}
          {eligible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
              {p.team ? " · " + p.team : ""}
            </option>
          ))}
        </select>
      </label>
      <small>
        {eligible.length} eligible for the selected times.{" "}
        {multiple
          ? "Use Ctrl/⌘ or touch selection to select several people."
          : ""}
      </small>
      {value.some((id) => !eligible.some((p) => p.id === id)) && (
        <p role="alert">
          A selected team member is no longer available. Reassign before saving.
        </p>
      )}
      {!!excluded.length && (
        <details>
          <summary>Unavailable staff ({excluded.length})</summary>
          <ul>
            {excluded.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>: {p.assessment.reasons.join("; ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
export function ResourceAssignment({
  records,
  value = [],
  onChange,
  label = "Equipment and resources",
}) {
  return (
    <label>
      {label}
      <select
        multiple
        aria-label={label}
        value={value}
        onChange={(e) =>
          onChange(Array.from(e.target.selectedOptions).map((o) => o.value))
        }
      >
        {resourceRecords(records).map((r) => (
          <option
            key={r.id}
            value={r.id}
            disabled={["Out of service", "Needs attention"].includes(
              r.condition,
            )}
          >
            {r.title} · {r.asset || r.resourceType || "Asset"}
            {r.condition ? " · " + r.condition : ""}
          </option>
        ))}
      </select>
      <small>
        Existing assets and registered rooms. Conflicting reservations are
        rejected on save.
      </small>
    </label>
  );
}
export function ScheduleCalendar({
  date,
  setDate,
  view,
  setView,
  records,
  onOpen,
  views = ["Month", "Week"],
  label = "Event calendar",
}) {
  const days = calendarDays(date, view),
    offset =
      view === "Month" ? (new Date(days[0] + "T12:00:00").getDay() + 6) % 7 : 0;
  const move = (delta) => {
    const d = new Date(date + "T12:00:00");
    if (view === "Month") {
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
    } else d.setDate(d.getDate() + delta * (view === "Week" ? 7 : 1));
    setDate(d.toISOString().slice(0, 10));
  };
  return (
    <section className="schedule-calendar" aria-label={label}>
      <div className="schedule-toolbar">
        <button
          aria-label={"Previous " + view.toLowerCase()}
          onClick={() => move(-1)}
        >
          ←
        </button>
        <label>
          Calendar date
          <input
            type="date"
            value={date}
            required
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
        <button
          aria-label={"Next " + view.toLowerCase()}
          onClick={() => move(1)}
        >
          →
        </button>
        <button onClick={() => setDate(new Date().toISOString().slice(0, 10))}>
          Today
        </button>
        <label>
          Calendar view
          <select value={view} onChange={(e) => setView(e.target.value)}>
            {views.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <div
        className={
          "schedule-calendar-grid " + (view === "Day" ? "schedule-day" : "")
        }
      >
        {view !== "Day" &&
          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span className="schedule-weekday" key={d}>
              {d}
            </span>
          ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {days.map((day) => {
          const items = records.filter(
            (r) => r.startTime?.slice(0, 10) === day,
          );
          return (
            <div
              key={day}
              className={"schedule-date " + (date === day ? "is-chosen" : "")}
            >
              <button
                className="schedule-date-number"
                aria-label={"Select " + day}
                aria-pressed={date === day}
                onClick={() => setDate(day)}
              >
                {Number(day.slice(-2))}
                <small>{items.length ? items.length + " scheduled" : ""}</small>
              </button>
              {items.map((r) => (
                <button
                  className="schedule-calendar-entry"
                  onClick={() => onOpen(r)}
                  key={r.id}
                >
                  <time>{r.startTime.slice(11)}</time>
                  <span>{r.title}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
