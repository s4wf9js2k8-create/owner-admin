import {
  EventConfiguration,
  AttendeeCheckin,
} from "../completion/EventExtensions";
import React, { useEffect, useState } from "react";
import { Empty, Modal, Status } from "../components";
import { moduleInfo } from "../customerModules";
import { firstModuleOfType, taskModuleFor } from "../customerWorkflows";
import { LinkedRecordFiles } from "../RecordFiles";
import { financialTotals, nextFinancialReference } from "../financialRules";
import {
  StaffAssignment,
  ResourceAssignment,
  ScheduleCalendar,
} from "./Controls";
import {
  eventRecord,
  eventReservations,
  eventUsage,
  eventAttendance,
  endAfter,
  validateScheduledRecord,
} from "./rules";
const nowDay = () => new Date().toISOString().slice(0, 10);
export default function EventsWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onNavigate,
  canCreate = true,
  canEdit = true,
  canExport = false,
  focusId,
  createRequest = 0,
}) {
  const all = records.filter((r) => r.orgId === org.id),
    events = all.filter(eventRecord),
    customers = all.filter((r) => moduleInfo(r.module).type === "crm");
  const [tab, setTab] = useState("Event planner"),
    [selected, setSelected] = useState(""),
    [editor, setEditor] = useState(null),
    [section, setSection] = useState("Overview"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [date, setDate] = useState(nowDay()),
    [view, setView] = useState("Month"),
    [search, setSearch] = useState("");
  const event = events.find((e) => e.id === selected) || events[0],
    bookings = event ? eventReservations(all, event.id) : [];
  const open = (r) => {
    if (r.recordType === "booking") {
      setSelected(r.eventId);
      setTab("Booking desk");
    } else {
      setSelected(r.id);
      setTab("Event detail");
    }
    setSection("Overview");
  };
  const start = (source) => {
    setNotice("");
    setEditor(
      source
        ? {
            ...source,
            staffIds: source.staffIds || [],
            resourceIds: source.resourceIds || [],
            endTime: source.endTime || endAfter(source.startTime),
            schedulingVersion: 1,
          }
        : {
            title: "",
            detail: "",
            startTime: "",
            endTime: "",
            location: org.workspaceConfig?.locations?.[0] || "Main hall",
            capacity: 30,
            staffIds: [],
            resourceIds: [],
            status: "Planned",
            schedulingVersion: 1,
          },
    );
  };
  useEffect(() => {
    if (focusId) {
      const r = all.find((r) => r.id === focusId);
      if (r) open(r);
    }
  }, [focusId]);
  useEffect(() => {
    if (createRequest) start();
  }, [createRequest]);
  const save = async (e) => {
    e.preventDefault();
    setNotice("");
    if (busy) return;
    try {
      const value = {
        ...editor,
        orgId: org.id,
        module: editor.module || module,
        recordType: "event",
        capacity: Number(editor.capacity),
        ownerId: editor.staffIds[0] || "",
        owner: "",
        dueDate: editor.startTime.slice(0, 10),
      };
      validateScheduledRecord(value, editor.id ? event : null, all, org);
      setBusy(true);
      const saved = editor.id
        ? await onUpdate(org.id, editor.id, valueWithoutIdentity(value))
        : await onAdd(value);
      if (saved) {
        setEditor(null);
        setSelected(editor.id || saved.id);
        setTab("Event detail");
        setNotice("Event saved with linked team and resources.");
      }
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };
  const changeBooking = async (b, next) => {
    if (busy || next === b.bookingStatus) return;
    setNotice("");
    setBusy(true);
    if (next === "Cancelled") {
      try {
        if (
          await onUpdate(org.id, b.id, {
            _workflow: { kind: "cancelReservation" },
          })
        )
          setNotice(
            "Booking cancelled; capacity and linked financial records updated.",
          );
      } finally {
        setBusy(false);
      }
      return;
    }
    const patch = {
      ...(b.attendees?.length
        ? {
            attendees: b.attendees.map((a) => ({
              ...a,
              checkedInAt:
                next === "Checked in"
                  ? a.checkedInAt || new Date().toISOString()
                  : "",
            })),
          }
        : {}),
      bookingStatus: next,
      status:
        next === "Cancelled"
          ? "Cancelled"
          : next === "Waitlist"
            ? "Waiting"
            : "Planned",
      ...(next === "Checked in"
        ? { checkedInAt: new Date().toISOString() }
        : {}),
      history: [
        ...(b.history || []),
        { at: new Date().toISOString(), text: "Booking " + next },
      ],
    };
    try {
      validateScheduledRecord({ ...b, ...patch }, b, all, org);
      if (await onUpdate(org.id, b.id, patch))
        setNotice("Booking updated; attendee counts have been recalculated.");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };
  const reserve = async (e) => {
    e.preventDefault();
    if (!event || busy) return;
    const form = e.currentTarget,
      f = Object.fromEntries(new FormData(form));
    setNotice("");
    try {
      const category = event.ticketCategories?.find(
        (t) => t.id === f.ticketCategoryId,
      );
      const guests = Number(f.guests),
        full = eventUsage(all, event.id) + guests > Number(event.capacity),
        bookingStatus = full ? "Waitlist" : "Confirmed";
      if (full && f.whenFull === "Reject")
        throw new Error(
          "Not enough places. Choose fewer places or join the waiting list.",
        );
      const r = {
        orgId: org.id,
        module: event.module,
        recordType: "booking",
        schedulingVersion: 1,
        eventId: event.id,
        customerId: f.customerId,
        title: f.title.trim(),
        guests,
        unitPrice: category ? Number(category.price) : Number(f.unitPrice),
        ticketCategoryId: category?.id || "",
        ticketCategoryName: category?.name || "",
        attendees: String(f.attendeeNames || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ id: crypto.randomUUID(), name })),
        bookingStatus,
        status: full ? "Waiting" : "Planned",
        history: [
          {
            at: new Date().toISOString(),
            text: "Reservation " + bookingStatus,
          },
        ],
        createdAt: new Date().toISOString(),
      };
      validateScheduledRecord(r, null, all, org);
      setBusy(true);
      if (await onAdd(r)) {
        setNotice(
          full
            ? "Capacity exceeded; booking added to the waitlist."
            : "Booking confirmed in the demo.",
        );
        form.reset();
      }
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };
  const invoice = async (b) => {
    const dest = firstModuleOfType(org, "finance"),
      existing = all.find(
        (r) => r.bookingId === b.id && r.recordType === "invoice",
      );
    if (existing) {
      onNavigate(existing.module, { recordId: existing.id });
      return;
    }
    if (!dest) return;
    const lineItems = [
        {
          description: event.title + " — " + b.title,
          quantity: Number(b.guests),
          rate: Number(b.unitPrice || 0),
          vat: 0,
          discount: 0,
        },
      ],
      totals = financialTotals(lineItems);
    setBusy(true);
    const saved = await onAdd({
      orgId: org.id,
      module: dest,
      recordType: "invoice",
      bookingId: b.id,
      customerId: b.customerId,
      reference: nextFinancialReference(all, "invoice"),
      title: "Booking invoice: " + b.title,
      documentStatus: "Draft",
      status: "Planned",
      creationDate: nowDay(),
      dueDate: endAfter(nowDay() + "T12:00", 30 * 1440).slice(0, 10),
      lineItems,
      totals,
      amount: totals.total / 100,
      payments: [],
      credits: [],
      history: [
        {
          at: new Date().toISOString(),
          text: "Created from confirmed event reservation",
        },
      ],
    });
    setBusy(false);
    if (saved) onNavigate(dest, { recordId: saved.id });
  };
  const eventTasks = event
    ? all.filter(
        (r) =>
          r.eventId === event.id && moduleInfo(r.module).type === "projects",
      )
    : [];
  const finishEvent = async (status) => {
    try {
      const patch = { status };
      validateScheduledRecord({ ...event, ...patch }, event, all, org);
      if (await onUpdate(org.id, event.id, patch))
        setNotice("Event " + status.toLowerCase() + ".");
    } catch (err) {
      setNotice(err.message);
    }
  };
  const shown = events.filter((e) =>
    [e.title, e.detail, e.location]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="scheduling-workspace events-delivery">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">EVENT DELIVERY</span>
          <h2>Events & visitor bookings</h2>
          <p>
            Plan the day, reserve equipment and staffing, then manage places and
            admissions.
          </p>
        </div>
        {canCreate && (
          <button className="action-primary" onClick={() => start()}>
            New event
          </button>
        )}
      </div>
      <div className="schedule-summary">
        <span>
          {
            events.filter((e) => !["Complete", "Cancelled"].includes(e.status))
              .length
          }{" "}
          active events
        </span>
        <span>
          {
            all.filter(
              (r) =>
                r.recordType === "booking" && r.bookingStatus === "Waitlist",
            ).length
          }{" "}
          waiting-list groups
        </span>
        <span>
          {events.reduce((n, e) => n + eventAttendance(all, e.id), 0)}{" "}
          checked-in visitors
        </span>
      </div>
      <div className="segmented-actions">
        {["Event planner", "Booking desk", "Check-in"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="schedule-notice">
          {notice}
        </p>
      )}
      {tab === "Event planner" && (
        <>
          <label>
            Find event
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <ScheduleCalendar
            records={shown.filter((e) => e.status !== "Cancelled")}
            date={date}
            setDate={setDate}
            view={view}
            setView={setView}
            onOpen={open}
          />
          <h3>Event plans</h3>
          <div className="event-plan-list">
            {shown.map((e) => (
              <article key={e.id} className="event-plan">
                <div className="event-plan-date">
                  <strong>{e.startTime?.slice(8, 10) || "—"}</strong>
                  <span>{e.startTime?.slice(0, 7) || "Unscheduled"}</span>
                  <time>{e.startTime?.slice(11)}</time>
                </div>
                <div>
                  <h3>{e.title}</h3>
                  <p>
                    {e.location || "Venue to confirm"} ·{" "}
                    <Status>{e.status}</Status>
                  </p>
                  <small>
                    {eventUsage(all, e.id)} / {e.capacity || 0} places ·{" "}
                    {(e.staffIds || []).length} assigned staff ·{" "}
                    {(e.resourceIds || []).length} resources
                  </small>
                </div>
                <div>
                  <button onClick={() => open(e)}>Open event</button>
                  <button
                    onClick={() => {
                      setSelected(e.id);
                      setTab("Booking desk");
                    }}
                  >
                    Manage bookings
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!shown.length && (
            <Empty>
              No event plans match. Use New event to schedule an activity.
            </Empty>
          )}
        </>
      )}
      {tab !== "Event planner" && (
        <>
          <label>
            Event
            <select
              aria-label="Choose event"
              value={event?.id || ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} — {e.startTime?.replace("T", " ") || "Unscheduled"}
                </option>
              ))}
            </select>
          </label>
          {!event ? (
            <Empty>Plan an event before accepting reservations.</Empty>
          ) : (
            <>
              <div className="event-capacity-strip">
                <strong>
                  {eventUsage(all, event.id)} confirmed places of{" "}
                  {event.capacity}
                </strong>
                <span>
                  {Math.max(
                    0,
                    Number(event.capacity) - eventUsage(all, event.id),
                  )}{" "}
                  available · {eventAttendance(all, event.id)} checked in ·{" "}
                  {
                    bookings.filter((b) => b.bookingStatus === "Waitlist")
                      .length
                  }{" "}
                  on waiting list
                </span>
                <progress
                  value={eventUsage(all, event.id)}
                  max={Math.max(1, Number(event.capacity))}
                />
              </div>
              {tab === "Event detail" && (
                <EventConfiguration
                  org={org}
                  event={event}
                  records={all}
                  onUpdate={onUpdate}
                  canEdit={canEdit}
                />
              )}
              {tab === "Event detail" && (
                <>
                  <div className="profile-tabs">
                    {[
                      "Overview",
                      "Staff & equipment",
                      "Tasks",
                      "Documents",
                      "History",
                    ].map((t) => (
                      <button
                        key={t}
                        aria-pressed={section === t}
                        onClick={() => setSection(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <section className="event-section">
                    {section === "Overview" && (
                      <>
                        <h3>{event.title}</h3>
                        <p>{event.detail}</p>
                        <p>
                          {event.startTime?.replace("T", " ")} →{" "}
                          {event.endTime?.replace("T", " ") ||
                            "End time to confirm"}
                        </p>
                        <p>{event.location}</p>
                        {canEdit &&
                          !["Complete", "Cancelled"].includes(event.status) && (
                            <>
                              <button onClick={() => start(event)}>
                                Edit event plan
                              </button>
                              <button onClick={() => finishEvent("Complete")}>
                                Complete event
                              </button>
                              <button onClick={() => finishEvent("Cancelled")}>
                                Cancel event
                              </button>
                            </>
                          )}
                        {canCreate && (
                          <button
                            onClick={() =>
                              start({
                                ...event,
                                id: undefined,
                                title: event.title + " (copy)",
                                status: "Planned",
                              })
                            }
                          >
                            Duplicate event
                          </button>
                        )}
                        <button onClick={() => setTab("Booking desk")}>
                          Reservations and admissions
                        </button>
                      </>
                    )}
                    {section === "Staff & equipment" && (
                      <>
                        <h3>Reserved team and resources</h3>
                        {!(event.staffIds || []).length && (
                          <p>
                            No staff assigned. Edit the plan to allocate
                            available team members.
                          </p>
                        )}
                        {[
                          ...(event.staffIds || []),
                          ...(event.resourceIds || []),
                        ].map((id) => {
                          const r = all.find((r) => r.id === id);
                          return r ? (
                            <button
                              className="schedule-linked"
                              key={id}
                              onClick={() =>
                                onNavigate(r.module, { recordId: r.id })
                              }
                            >
                              {r.title} · Open {r.module}
                            </button>
                          ) : (
                            <p key={id}>Linked record unavailable: {id}</p>
                          );
                        })}
                        <p>
                          These allocations appear in staff schedules and block
                          conflicting assignments.
                        </p>
                      </>
                    )}
                    {section === "Tasks" && (
                      <>
                        <h3>Preparation and delivery</h3>
                        {eventTasks.map((r) => (
                          <button
                            className="schedule-linked"
                            key={r.id}
                            onClick={() =>
                              onNavigate("Tasks & projects", { recordId: r.id })
                            }
                          >
                            {r.title} · {r.status}
                          </button>
                        ))}
                        {canCreate && taskModuleFor(org) && (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const form = e.currentTarget,
                                f = Object.fromEntries(new FormData(form));
                              const r = await onAdd({
                                orgId: org.id,
                                module: taskModuleFor(org),
                                recordType: "task",
                                eventId: event.id,
                                title: f.title,
                                ownerId: f.ownerId,
                                owner:
                                  all.find((p) => p.id === f.ownerId)?.title ||
                                  "",
                                dueDate: event.startTime?.slice(0, 10),
                                status: "Planned",
                                priority: "Normal",
                                detail: "Event preparation: " + event.title,
                              });
                              if (r) {
                                form.reset();
                                setNotice(
                                  "Preparation task linked to this event and My Work.",
                                );
                              }
                            }}
                          >
                            <label>
                              Preparation task
                              <input name="title" required maxLength={100} />
                            </label>
                            <label>
                              Responsible team member
                              <select name="ownerId" required>
                                <option value="">Choose assigned staff</option>
                                {(event.staffIds || []).map((id) => (
                                  <option key={id} value={id}>
                                    {all.find((p) => p.id === id)?.title ||
                                      "Unavailable staff"}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button>Create linked task</button>
                          </form>
                        )}
                      </>
                    )}
                    {section === "Documents" && (
                      <LinkedRecordFiles
                        record={event}
                        records={all}
                        onNavigate={onNavigate}
                      />
                    )}
                    {section === "History" && (
                      <>
                        {(event.activity || []).map((a) => (
                          <p className="task-note" key={a.id}>
                            {a.at} · {a.action} · {a.details}
                          </p>
                        ))}
                        {bookings.map((b) => (
                          <p key={b.id}>
                            {b.title}: {b.bookingStatus}
                          </p>
                        ))}
                      </>
                    )}
                  </section>
                </>
              )}
              {tab === "Booking desk" &&
                canCreate &&
                !["Complete", "Cancelled"].includes(event.status) && (
                  <form className="event-reservation-form" onSubmit={reserve}>
                    <h3>Reserve places</h3>
                    <div className="form-pair">
                      <label>
                        CRM customer
                        <select
                          name="customerId"
                          defaultValue={customers[0]?.id || ""}
                          required
                        >
                          <option value="">Choose existing customer</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.company || c.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Attendee or group
                        <input name="title" required maxLength={100} />
                      </label>
                      <label>
                        Ticket category
                        <select
                          name="ticketCategoryId"
                          required={Boolean(event.ticketCategories?.length)}
                        >
                          <option value="">Standard / no category</option>
                          {(event.ticketCategories || []).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} · £{Number(t.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Individual attendee names (one per place, optional)
                        <textarea
                          name="attendeeNames"
                          placeholder="Use fictional names only"
                        />
                      </label>
                      <label>
                        Places
                        <input
                          name="guests"
                          type="number"
                          min="1"
                          step="1"
                          defaultValue="1"
                          required
                        />
                      </label>
                      <label>
                        Unit price (£, fictional)
                        <input
                          name="unitPrice"
                          type="number"
                          min="0"
                          max="1000000"
                          step=".01"
                          defaultValue="0"
                          required
                        />
                      </label>
                      <label>
                        When full
                        <select name="whenFull">
                          <option>Waitlist</option>
                          <option>Reject</option>
                        </select>
                      </label>
                    </div>
                    <button disabled={busy || !customers.length}>
                      Reserve places
                    </button>
                    {!customers.length && (
                      <p>
                        Enable CRM and add a customer before taking bookings.
                      </p>
                    )}
                  </form>
                )}
              {tab !== "Event detail" && (
                <div className="table-wrap reservation-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Attendee</th>
                        <th>Places</th>
                        <th>Booking status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings
                        .filter(
                          (b) =>
                            tab !== "Check-in" ||
                            ["Confirmed", "Checked in"].includes(
                              b.bookingStatus,
                            ),
                        )
                        .map((b) => (
                          <tr key={b.id}>
                            <td>
                              <strong>{b.title}</strong>
                              <small>
                                {all.find((c) => c.id === b.customerId)
                                  ?.company ||
                                  all.find((c) => c.id === b.customerId)
                                    ?.title ||
                                  "Legacy attendee; CRM not linked"}
                              </small>
                              <AttendeeCheckin
                                canExport={canExport}
                                org={org}
                                booking={b}
                                onUpdate={onUpdate}
                                canEdit={canEdit}
                              />
                            </td>
                            <td data-label="Places">{b.guests}</td>
                            <td>
                              <Status>{b.bookingStatus}</Status>
                            </td>
                            <td>
                              {canEdit && (
                                <select
                                  aria-label={"Booking status for " + b.title}
                                  value={b.bookingStatus}
                                  disabled={busy}
                                  onChange={(e) =>
                                    changeBooking(b, e.target.value)
                                  }
                                >
                                  {[
                                    "Confirmed",
                                    "Waitlist",
                                    "Checked in",
                                    "Cancelled",
                                  ].map((s) => (
                                    <option
                                      disabled={
                                        s === "Checked in" &&
                                        !["Confirmed", "Checked in"].includes(
                                          b.bookingStatus,
                                        )
                                      }
                                      key={s}
                                    >
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {canCreate &&
                                firstModuleOfType(org, "finance") &&
                                Number(b.unitPrice) > 0 &&
                                ["Confirmed", "Checked in"].includes(
                                  b.bookingStatus,
                                ) && (
                                  <button
                                    disabled={busy}
                                    onClick={() => invoice(b)}
                                  >
                                    {all.some((r) => r.bookingId === b.id)
                                      ? "Open booking invoice"
                                      : "Create booking invoice"}
                                  </button>
                                )}
                              {b.customerId && (
                                <button
                                  onClick={() => {
                                    const c = all.find(
                                      (r) => r.id === b.customerId,
                                    );
                                    if (c)
                                      onNavigate(c.module, { recordId: c.id });
                                  }}
                                >
                                  Open customer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!bookings.length && (
                    <Empty>
                      No reservations yet. Choose a customer and reserve places
                      above.
                    </Empty>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      {editor && (
        <Modal
          title={editor.id ? "Edit event plan" : "Plan an event"}
          onClose={() => setEditor(null)}
        >
          <form onSubmit={save}>
            <label>
              Event name
              <input
                required
                maxLength={100}
                value={editor.title}
                onChange={(e) =>
                  setEditor({ ...editor, title: e.target.value })
                }
              />
            </label>
            <div className="form-pair">
              <label>
                Starts
                <input
                  type="datetime-local"
                  required
                  value={editor.startTime || ""}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      startTime: e.target.value,
                      endTime:
                        !editor.endTime || editor.endTime <= e.target.value
                          ? endAfter(e.target.value)
                          : editor.endTime,
                    })
                  }
                />
              </label>
              <label>
                Ends
                <input
                  type="datetime-local"
                  required
                  value={editor.endTime || ""}
                  onChange={(e) =>
                    setEditor({ ...editor, endTime: e.target.value })
                  }
                />
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={editor.capacity}
                  onChange={(e) =>
                    setEditor({ ...editor, capacity: e.target.value })
                  }
                />
              </label>
              <label>
                Venue
                <select
                  required
                  value={editor.location || ""}
                  onChange={(e) =>
                    setEditor({ ...editor, location: e.target.value })
                  }
                >
                  <option value="">Choose location</option>
                  {[
                    ...new Set([
                      ...(org.workspaceConfig?.locations || [
                        "Main hall",
                        "Workshop",
                        "Site",
                      ]),
                      ...all.map((r) => r.location).filter(Boolean),
                    ]),
                  ].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Required competency (optional)
              <select
                aria-label="Required competency"
                value={editor.requiredQualification || ""}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    requiredQualification: e.target.value,
                  })
                }
              >
                <option value="">No specialist competency required</option>
                {[
                  ...new Set(
                    all
                      .filter((r) => moduleInfo(r.module).type === "training")
                      .map((r) => r.qualification)
                      .filter(Boolean),
                  ),
                ].map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            </label>
            <StaffAssignment
              records={all}
              orgId={org.id}
              startTime={editor.startTime}
              endTime={editor.endTime}
              requiredQualification={editor.requiredQualification}
              excludedRecordId={editor.id}
              value={editor.staffIds || []}
              onChange={(v) => setEditor({ ...editor, staffIds: v })}
              multiple
            />
            <ResourceAssignment
              records={all}
              value={editor.resourceIds || []}
              onChange={(v) => setEditor({ ...editor, resourceIds: v })}
            />
            <label>
              Plan and notes
              <textarea
                value={editor.detail || ""}
                onChange={(e) =>
                  setEditor({ ...editor, detail: e.target.value })
                }
              />
            </label>
            {notice && <p role="alert">{notice}</p>}
            <button disabled={busy}>
              {editor.id ? "Save event changes" : "Create event"}
            </button>
          </form>
        </Modal>
      )}
      <p className="module-disclaimer">
        Session-only fictional reservations and invoices. No tickets, payments
        or external messages are issued.
      </p>
    </div>
  );
}
function valueWithoutIdentity(value) {
  const { id, orgId, module, ...fields } = value;
  void id;
  void orgId;
  void module;
  return fields;
}
