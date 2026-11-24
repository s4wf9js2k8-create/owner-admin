import { eventStaffing } from "../reconciliation/rules";
import React, { useState } from "react";
import { exportCsv } from "./Shared";
export function EventConfiguration({
  org,
  event: r,
  onUpdate,
  canEdit,
  records,
}) {
  const [message, setMessage] = useState("");
  const staffing = eventStaffing(r, records);
  return (
    <details className="completion-workspace">
      <summary>Ticket categories and event checklist</summary>
      <p>
        Ticket-category capacities share the overall event limit. Existing
        reservation prices are retained.
      </p>
      {(r.ticketCategories || []).map((t) => (
        <article className="completion-entry" key={t.id}>
          {t.name} · £{Number(t.price).toFixed(2)} ·{" "}
          {records
            .filter(
              (b) =>
                b.eventId === r.id &&
                b.ticketCategoryId === t.id &&
                ["Confirmed", "Checked in"].includes(b.bookingStatus),
            )
            .reduce((n, b) => n + Number(b.guests), 0)}{" "}
          / {t.capacity} reserved
          {canEdit && (
            <button
              onClick={() =>
                onUpdate(org.id, r.id, {
                  ticketCategories: r.ticketCategories.filter(
                    (x) => x.id !== t.id,
                  ),
                })
              }
            >
              Remove category
            </button>
          )}
        </article>
      ))}
      {canEdit && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form));
            if (
              await onUpdate(org.id, r.id, {
                ticketCategories: [
                  ...(r.ticketCategories || []),
                  {
                    id: crypto.randomUUID(),
                    name: f.name,
                    price: Number(f.price),
                    capacity: Number(f.capacity),
                  },
                ],
              })
            ) {
              form.reset();
              setMessage("Ticket category saved.");
            }
          }}
        >
          <label>
            Ticket category name
            <input name="name" required />
          </label>
          <label>
            Category price (£)
            <input
              name="price"
              type="number"
              min="0"
              max="1000000"
              step=".01"
              required
            />
          </label>
          <label>
            Category capacity
            <input
              name="capacity"
              type="number"
              min="1"
              step="1"
              max={r.capacity}
              required
            />
          </label>
          <button>Add ticket category</button>
        </form>
      )}
      <h3>Event staffing requirement</h3>
      <p role="status">
        {staffing.eligible} eligible assigned / {staffing.required} required
        {staffing.shortfall
          ? " · Staffing shortfall: " + staffing.shortfall
          : ""}
      </p>
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(org.id, r.id, {
              minimumStaff: Number(
                new FormData(e.currentTarget).get("minimumStaff"),
              ),
            });
          }}
        >
          <label>
            Minimum event staff
            <input
              name="minimumStaff"
              type="number"
              min="0"
              max="1000"
              step="1"
              required
              defaultValue={r.minimumStaff || 0}
            />
          </label>
          <button>Save event staffing minimum</button>
        </form>
      )}
      <h3>Event readiness checklist</h3>
      {(r.eventChecklist || []).map((c, i) => (
        <label className="task-check" key={c.id}>
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={Boolean(c.done)}
            onChange={(e) =>
              onUpdate(org.id, r.id, {
                eventChecklist: r.eventChecklist.map((x, j) =>
                  i === j
                    ? {
                        ...x,
                        done: e.target.checked,
                        completedAt: e.target.checked
                          ? new Date().toISOString()
                          : "",
                      }
                    : x,
                ),
              })
            }
          />
          {c.text} {c.completedAt && " · " + c.completedAt}
        </label>
      ))}
      {canEdit && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              text = new FormData(form).get("text");
            if (
              await onUpdate(org.id, r.id, {
                eventChecklist: [
                  ...(r.eventChecklist || []),
                  { id: crypto.randomUUID(), text, done: false },
                ],
              })
            )
              form.reset();
          }}
        >
          <label>
            Event preparation check
            <input name="text" required maxLength={150} />
          </label>
          <button>Add event check</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
export function AttendeeCheckin({
  org,
  booking: b,
  onUpdate,
  canEdit,
  canExport,
}) {
  return (
    <details className="completion-workspace">
      <summary>Individual attendees ({b.attendees?.length || 0})</summary>
      {!b.attendees?.length && (
        <p>
          Group reservation: use the group check-in control. Add individual
          names when creating a new reservation.
        </p>
      )}
      {(b.attendees || []).map((a) => (
        <p key={a.id}>
          {a.name} ·{" "}
          {a.checkedInAt ? "Checked in " + a.checkedInAt : "Not checked in"}
          {canEdit && ["Confirmed", "Checked in"].includes(b.bookingStatus) && (
            <button
              onClick={() =>
                onUpdate(org.id, b.id, {
                  _workflow: {
                    kind: "checkAttendee",
                    attendeeId: a.id,
                    undo: Boolean(a.checkedInAt),
                  },
                })
              }
            >
              {a.checkedInAt ? "Undo check-in for " : "Check in "}
              {a.name}
            </button>
          )}
        </p>
      ))}
      {canExport && (
        <button
          onClick={() =>
            exportCsv("attendees", [
              ["Booking", "Attendee ID", "Name", "Checked in"],
              ...(b.attendees || []).map((a) => [
                b.title,
                a.id,
                a.name,
                a.checkedInAt || "",
              ]),
            ])
          }
        >
          Download attendee list
        </button>
      )}
    </details>
  );
}
