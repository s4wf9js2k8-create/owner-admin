import React, { useEffect, useState } from "react";
import { Modal, Status } from "../components";
import { moduleInfo } from "../customerModules";
import { resourceRecords, validateInterval } from "../scheduling/rules";
import { StaffAssignment, ScheduleCalendar } from "../scheduling/Controls";
import {
  serviceBooking,
  remainingCapacity,
  validateOriginalRecord,
} from "./rules";
export default function ResourceBookings({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onNavigate,
  canCreate,
  canEdit,
  onConfigure,
  focusId,
}) {
  const rows = records.filter(serviceBooking),
    customers = records.filter((r) => moduleInfo(r.module).type === "crm"),
    resources = resourceRecords(records);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [view, setView] = useState("Week"),
    [filter, setFilter] = useState("Active"),
    [editor, setEditor] = useState(null),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const types = org.workspaceConfig?.bookingTypes || [
    "Activity",
    "Experience",
    "Equipment hire",
    "Facility",
    "Service",
  ];
  useEffect(() => {
    if (focusId && rows.some((r) => r.id === focusId)) setSelected(focusId);
  }, [focusId]);
  const current = rows.find((r) => r.id === selected),
    shown = rows.filter((r) =>
      filter === "All" || filter === "Active"
        ? filter === "All" || ["Pending", "Confirmed"].includes(r.status)
        : r.status === filter,
    );
  const start = (r) => {
    setSelected("");
    setMessage("");
    setEditor(
      r
        ? { ...r }
        : {
            title: "",
            recordType: "resource-booking",
            bookingType: types[0],
            customerId: "",
            startTime: date + "T09:00",
            endTime: date + "T10:00",
            resourceIds: [],
            guests: 1,
            unitPrice: 0,
            status: "Confirmed",
            personId: "",
          },
    );
  };
  let capacity = null;
  if (editor?.resourceIds?.length) {
    try {
      validateInterval(editor.startTime, editor.endTime);
      const resource = resources.find((r) => r.id === editor.resourceIds[0]);
      if (resource)
        capacity = remainingCapacity(resource, records, {
          ...editor,
          orgId: org.id,
        });
      if (resource?.bookingMode !== "Shared capacity" && capacity > 0)
        capacity = Number(resource.capacity || 1);
    } catch {
      /* Availability requires a valid interval. */
    }
  }
  const command = async (kind) => {
    if (busy) return;
    setBusy(true);
    if (await onUpdate(org.id, current.id, { _workflow: { kind } }))
      setMessage(
        kind === "cancelResourceBooking"
          ? "Booking cancelled; capacity and linked finance updated."
          : "Draft invoice linked to booking.",
      );
    setBusy(false);
  };
  return (
    <section className="completion-workspace resource-bookings">
      <div className="customer-page-intro">
        <div>
          <h3>Service and resource bookings</h3>
          <p>
            Reserve activities, facilities or equipment for an existing
            customer. Shared resources enforce concurrent capacity; events and
            appointments reserve resources exclusively.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => start()}>New resource booking</button>
        )}
      </div>
      <label>
        Resource booking status
        <select
          aria-label="Resource booking status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            "Active",
            "Pending",
            "Confirmed",
            "Complete",
            "Cancelled",
            "All",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <ScheduleCalendar
        date={date}
        setDate={setDate}
        view={view}
        setView={setView}
        records={shown}
        onOpen={(r) => setSelected(r.id)}
        label="Resource booking calendar"
      />
      <div className="purpose-grid">
        {shown.map((b) => (
          <article className="purpose-card resource-booking-card" key={b.id}>
            <h4>{b.title}</h4>
            <Status>{b.status}</Status>
            <p>
              {b.bookingType} · {b.startTime?.replace("T", " ")} · {b.guests}{" "}
              places/units
            </p>
            <p>
              {customers.find((c) => c.id === b.customerId)?.company ||
                customers.find((c) => c.id === b.customerId)?.title}{" "}
              · £{(Number(b.guests) * Number(b.unitPrice)).toFixed(2)}
            </p>
            <button onClick={() => setSelected(b.id)}>
              Open resource booking
            </button>
          </article>
        ))}
      </div>
      {!shown.length && (
        <p>
          No bookings in this view. Choose New resource booking to reserve an
          available resource.
        </p>
      )}
      {onConfigure && (
        <details>
          <summary>Configure booking types</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const types = [
                ...new Set(
                  new FormData(e.currentTarget)
                    .get("types")
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                ),
              ];
              if (
                types.length &&
                (await onConfigure(
                  { workspaceConfig: { bookingTypes: types } },
                  "Updated booking types",
                ))
              )
                setMessage("Booking types saved.");
            }}
          >
            <label>
              Booking types (one per line)
              <textarea name="types" required defaultValue={types.join("\n")} />
            </label>
            <button>Save booking types</button>
          </form>
        </details>
      )}
      {editor && (
        <Modal
          title={editor.id ? "Change resource booking" : "New resource booking"}
          onClose={() => setEditor(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              try {
                const record = {
                  ...editor,
                  orgId: org.id,
                  module,
                  guests: Number(editor.guests),
                  unitPrice: Number(editor.unitPrice),
                  resourceId: editor.resourceIds[0],
                  location:
                    resources.find((r) => r.id === editor.resourceIds[0])
                      ?.location || "",
                  dueDate: editor.startTime.slice(0, 10),
                };
                validateOriginalRecord(
                  record,
                  rows.find((r) => r.id === record.id),
                  records,
                  org,
                );
                setBusy(true);
                const { id, orgId, module: target, ...patch } = record;
                const ok = id
                  ? await onUpdate(orgId, id, patch)
                  : await onAdd({ ...patch, orgId, module: target });
                if (ok) {
                  setEditor(null);
                  setDate(record.startTime.slice(0, 10));
                  setMessage("Resource booking saved.");
                }
              } catch (err) {
                setMessage(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Booking title
              <input
                required
                value={editor.title}
                onChange={(e) =>
                  setEditor({ ...editor, title: e.target.value })
                }
              />
            </label>
            <label>
              Booking type
              <select
                aria-label="Booking type"
                value={editor.bookingType}
                onChange={(e) =>
                  setEditor({ ...editor, bookingType: e.target.value })
                }
              >
                {[...new Set([...types, editor.bookingType])].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Booking customer
              <select
                aria-label="Booking customer"
                required
                value={editor.customerId}
                onChange={(e) =>
                  setEditor({ ...editor, customerId: e.target.value })
                }
              >
                <option value="">Select CRM customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-pair">
              {[
                ["startTime", "Booking starts"],
                ["endTime", "Booking ends"],
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <input
                    type="datetime-local"
                    required
                    value={editor[k]}
                    onChange={(e) =>
                      setEditor({ ...editor, [k]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Bookable resource
              <select
                aria-label="Bookable resource"
                required
                value={editor.resourceIds[0] || ""}
                onChange={(e) =>
                  setEditor({ ...editor, resourceIds: [e.target.value] })
                }
              >
                <option value="">Choose an existing room or asset</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ·{" "}
                    {r.bookingMode === "Shared capacity"
                      ? r.capacity + " places"
                      : "Exclusive"}
                  </option>
                ))}
              </select>
            </label>
            {capacity !== null && (
              <p role="status">
                {capacity} places/units available for these times.
              </p>
            )}
            <div className="form-pair">
              <label>
                Places or units
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={editor.guests}
                  onChange={(e) =>
                    setEditor({ ...editor, guests: e.target.value })
                  }
                />
              </label>
              <label>
                Booking unit price (£)
                <input
                  required
                  type="number"
                  min="0"
                  step=".01"
                  value={editor.unitPrice}
                  onChange={(e) =>
                    setEditor({ ...editor, unitPrice: e.target.value })
                  }
                />
              </label>
            </div>
            <StaffAssignment
              records={records}
              orgId={org.id}
              startTime={editor.startTime}
              endTime={editor.endTime}
              excludedRecordId={editor.id}
              value={[editor.personId].filter(Boolean)}
              onChange={(ids) =>
                setEditor({ ...editor, personId: ids[0] || "" })
              }
              label="Booking employee"
            />
            <label>
              Reservation state
              <select
                aria-label="Reservation state"
                value={editor.status}
                onChange={(e) =>
                  setEditor({ ...editor, status: e.target.value })
                }
              >
                <option>Confirmed</option>
                <option>Pending</option>
              </select>
            </label>
            <label>
              Booking notes
              <textarea
                value={editor.detail || ""}
                onChange={(e) =>
                  setEditor({ ...editor, detail: e.target.value })
                }
              />
            </label>
            {message && <p role="alert">{message}</p>}
            <button disabled={busy}>Save resource booking</button>
          </form>
        </Modal>
      )}
      {current && (
        <Modal title="Resource booking details" onClose={() => setSelected("")}>
          <h3>{current.title}</h3>
          <Status>{current.status}</Status>
          <p>
            {current.startTime?.replace("T", " ")} →{" "}
            {current.endTime?.replace("T", " ")}
          </p>
          <p>
            {current.guests} places/units · £
            {(current.guests * current.unitPrice).toFixed(2)}
          </p>
          <p>{current.detail}</p>
          {current.resourceIds.map((id) => (
            <p key={id}>
              {resources.find((r) => r.id === id)?.title ||
                "Resource unavailable"}
            </p>
          ))}
          <button
            onClick={() =>
              onNavigate(
                customers.find((c) => c.id === current.customerId)?.module,
                { recordId: current.customerId },
              )
            }
          >
            Open booking customer
          </button>
          {canEdit && ["Pending", "Confirmed"].includes(current.status) && (
            <div className="quick-actions">
              {!current.invoiceId && (
                <button onClick={() => start(current)}>Change booking</button>
              )}
              {current.status === "Pending" && (
                <button
                  onClick={() =>
                    onUpdate(org.id, current.id, { status: "Confirmed" })
                  }
                >
                  Confirm resource booking
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => command("cancelResourceBooking")}
              >
                Cancel resource booking
              </button>
              {current.status === "Confirmed" && (
                <button
                  onClick={() =>
                    onUpdate(org.id, current.id, {
                      status: "Complete",
                      completedAt: new Date().toISOString(),
                    })
                  }
                >
                  Complete resource booking
                </button>
              )}
            </div>
          )}
          {current.invoiceId ? (
            <button
              onClick={() => {
                const inv = records.find((r) => r.id === current.invoiceId);
                if (inv) onNavigate(inv.module, { recordId: inv.id });
              }}
            >
              Open booking invoice
            </button>
          ) : (
            canCreate &&
            ["Confirmed", "Complete"].includes(current.status) &&
            Number(current.unitPrice) > 0 &&
            org.modules.some((m) => moduleInfo(m).type === "finance") && (
              <button
                disabled={busy}
                onClick={() => command("invoiceResourceBooking")}
              >
                Create resource booking invoice
              </button>
            )
          )}
          {message && <p role="status">{message}</p>}
        </Modal>
      )}
      {message && !editor && !current && <p role="status">{message}</p>}
      <p>
        Fictional reservations and pricing only; no external confirmation or
        payment is sent.
      </p>
    </section>
  );
}
