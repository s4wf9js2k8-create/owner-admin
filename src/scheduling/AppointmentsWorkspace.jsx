import ResourceBookings from "../reconciliation/ResourceBookings";
import React, { useEffect, useState } from "react";
import { Empty, Modal, Status } from "../components";
import { moduleInfo } from "../customerModules";
import { taskModuleFor } from "../customerWorkflows";
import {
  StaffAssignment,
  ResourceAssignment,
  ScheduleCalendar,
} from "./Controls";
import { appointmentRecord, endAfter, validateScheduledRecord } from "./rules";
const today = () => new Date().toISOString().slice(0, 10);
export default function AppointmentsWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onNavigate,
  focusId,
  createRequest,
  canCreate = true,
  canEdit = true,
  onConfigure,
}) {
  const all = records.filter((r) => r.orgId === org.id),
    rows = all.filter(appointmentRecord),
    customers = all.filter((r) => moduleInfo(r.module).type === "crm"),
    resources = all.filter((r) => r.recordType === "resource");
  const [date, setDate] = useState(today()),
    [view, setView] = useState("Week"),
    [tab, setTab] = useState("Diary"),
    [selected, setSelected] = useState(""),
    [editor, setEditor] = useState(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("Active"),
    [staffFilter, setStaffFilter] = useState("");
  const current = rows.find((r) => r.id === selected),
    staff = all.filter((r) => moduleInfo(r.module).type === "people");
  const shown = rows.filter(
    (r) =>
      (filter === "All" ||
        (filter === "Active"
          ? !["Complete", "Cancelled"].includes(r.status)
          : r.status === filter)) &&
      (!staffFilter || r.personId === staffFilter),
  );
  const open = (r) => {
    setSelected(r.id);
    setNotice("");
  };
  const start = (r) => {
    setSelected("");
    setNotice("");
    setEditor(
      r
        ? {
            ...r,
            resourceIds: r.resourceIds || [],
            endTime: r.endTime || endAfter(r.startTime),
            schedulingVersion: 1,
            status: "Confirmed",
          }
        : {
            title: "",
            startTime: date + "T09:00",
            endTime: date + "T10:00",
            bookingType: "Customer visit",
            customerId: "",
            personId: "",
            resourceIds: [],
            status: "Confirmed",
            schedulingVersion: 1,
          },
    );
  };
  useEffect(() => {
    if (focusId) {
      if (
        all.some((r) => r.id === focusId && r.recordType === "resource-booking")
      )
        setTab("Resource bookings");
      const r = rows.find((r) => r.id === focusId);
      if (r) {
        setSelected(r.id);
        setDate(r.startTime?.slice(0, 10) || today());
      }
    }
  }, [focusId]);
  useEffect(() => {
    if (createRequest) start();
  }, [createRequest]);
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    setNotice("");
    try {
      const value = {
        ...editor,
        orgId: org.id,
        module: editor.module || module,
        recordType: "appointment",
        owner: "",
        ownerId: "",
        dueDate: editor.startTime.slice(0, 10),
        location:
          all.find((r) => r.id === (editor.resourceIds || [])[0])?.title ||
          editor.location ||
          "Unallocated location",
      };
      validateScheduledRecord(
        value,
        editor.id ? rows.find((r) => r.id === editor.id) : null,
        all,
        org,
      );
      setBusy(true);
      const { id, orgId, module: destination, ...patch } = value;
      const saved = id
        ? await onUpdate(orgId, id, patch)
        : await onAdd({ ...patch, orgId, module: destination });
      if (saved) {
        setDate(editor.startTime.slice(0, 10));
        setEditor(null);
        setNotice(
          "Appointment saved; staff and resource availability updated.",
        );
      }
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };
  const change = async (patch) => {
    try {
      const value = { ...current, ...patch };
      validateScheduledRecord(value, current, all, org);
      if (await onUpdate(org.id, current.id, patch))
        setNotice("Appointment updated.");
    } catch (err) {
      setNotice(err.message);
    }
  };
  const followUp = async (e) => {
    e.preventDefault();
    if (busy) return;
    const existing = all.find((r) => r.followUpForId === current.id);
    if (existing) {
      onNavigate("Tasks & projects", { recordId: existing.id });
      return;
    }
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    const saved = await onAdd({
      orgId: org.id,
      module: taskModuleFor(org),
      recordType: "task",
      followUpForId: current.id,
      customerId: current.customerId || "",
      title: f.title,
      dueDate: f.dueDate,
      ownerId: current.personId,
      owner: staff.find((p) => p.id === current.personId)?.title || "",
      status: "Planned",
      priority: "Normal",
      detail: "Follow-up from " + current.title,
    });
    setBusy(false);
    if (saved) {
      setSelected("");
      onNavigate("Tasks & projects", { recordId: saved.id });
    }
  };
  return (
    <div className="scheduling-workspace appointment-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">STAFF & RESOURCE DIARY</span>
          <h2>Bookings & appointments</h2>
          <p>
            Customer visits, consultations, internal meetings and equipment or
            room reservations.
          </p>
        </div>
        {canCreate && (
          <button className="action-primary" onClick={() => start()}>
            Book appointment
          </button>
        )}
      </div>
      <div className="segmented-actions">
        {["Diary", "Resource bookings", "Resources", "History"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {notice && (
        <p className="schedule-notice" role="status">
          {notice}
        </p>
      )}
      {tab === "Resource bookings" ? (
        <ResourceBookings
          org={org}
          module={module}
          records={all}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onNavigate={onNavigate}
          canCreate={canCreate}
          canEdit={canEdit}
          onConfigure={onConfigure}
          focusId={focusId}
        />
      ) : tab === "Resources" ? (
        <>
          <h3>Shared rooms and facilities</h3>
          <p>
            Registered resources and existing equipment use the same conflict
            checks as event allocations.
          </p>
          <div className="schedule-resource-list">
            {resources.map((r) => (
              <article key={r.id}>
                <h3>{r.title}</h3>
                <p>
                  {r.resourceType} · {r.location}
                </p>
                <small>
                  {
                    rows.filter(
                      (a) =>
                        a.resourceIds?.includes(r.id) &&
                        !["Complete", "Cancelled"].includes(a.status),
                    ).length
                  }{" "}
                  active reservations
                </small>
                {canEdit && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      if (
                        await onUpdate(org.id, r.id, {
                          capacity: Number(f.capacity),
                          bookingMode: f.bookingMode,
                        })
                      )
                        setNotice("Resource capacity saved.");
                    }}
                  >
                    <label>
                      Capacity for {r.title}
                      <input
                        name="capacity"
                        type="number"
                        min="1"
                        step="1"
                        required
                        defaultValue={r.capacity || 1}
                      />
                    </label>
                    <label>
                      Reservation model for {r.title}
                      <select
                        name="bookingMode"
                        defaultValue={r.bookingMode || "Exclusive"}
                      >
                        <option>Exclusive</option>
                        <option>Shared capacity</option>
                      </select>
                    </label>
                    <button>Save resource capacity</button>
                  </form>
                )}
              </article>
            ))}
          </div>
          {canCreate && (
            <form
              className="schedule-resource-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = Object.fromEntries(new FormData(form));
                if (
                  resources.some(
                    (r) =>
                      r.title.toLowerCase() === f.title.trim().toLowerCase(),
                  )
                ) {
                  setNotice("A resource with this name already exists.");
                  return;
                }
                const r = await onAdd({
                  orgId: org.id,
                  module,
                  recordType: "resource",
                  title: f.title.trim(),
                  resourceType: f.resourceType,
                  capacity: Number(f.capacity),
                  bookingMode: f.bookingMode,
                  location: f.location,
                  status: "Active",
                });
                if (r) {
                  form.reset();
                  setNotice(
                    "Shared resource registered. It can now be reserved by ID.",
                  );
                }
              }}
            >
              <h3>Register a shared resource</h3>
              <label>
                Resource name
                <input name="title" required maxLength={100} />
              </label>
              <label>
                Resource type
                <select name="resourceType">
                  <option>Meeting room</option>
                  <option>Facility</option>
                  <option>Service space</option>
                </select>
              </label>
              <label>
                Resource location
                <select name="location">
                  {(
                    org.workspaceConfig?.locations || [
                      "Main hall",
                      "Workshop",
                      "Reception",
                    ]
                  ).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Resource capacity
                <input
                  type="number"
                  name="capacity"
                  min="1"
                  step="1"
                  required
                  defaultValue="1"
                />
              </label>
              <label>
                Reservation model
                <select name="bookingMode">
                  <option>Exclusive</option>
                  <option>Shared capacity</option>
                </select>
              </label>
              <button>Add shared resource</button>
            </form>
          )}
        </>
      ) : (
        <>
          <div className="schedule-toolbar">
            <label>
              Appointment status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["Active", "All", "Confirmed", "Complete", "Cancelled"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Staff diary
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
              >
                <option value="">All permitted staff</option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {tab === "Diary" && (
            <ScheduleCalendar
              label="Appointment diary"
              views={["Day", "Week"]}
              date={date}
              setDate={setDate}
              view={view}
              setView={setView}
              records={shown}
              onOpen={open}
            />
          )}
          <h3>
            {tab === "History"
              ? "Appointment history"
              : "Scheduled appointments"}
          </h3>
          <div className="schedule-appointment-list">
            {shown
              .sort((a, b) =>
                (a.startTime || "").localeCompare(b.startTime || ""),
              )
              .map((r) => (
                <article className="schedule-appointment" key={r.id}>
                  <time>
                    {r.startTime?.replace("T", " ") || "Time to confirm"}
                    <small>to {r.endTime?.slice(11) || "unrecorded end"}</small>
                  </time>
                  <div>
                    <h3>{r.title}</h3>
                    <p>
                      {staff.find((p) => p.id === r.personId)?.title ||
                        r.owner ||
                        "Staff not assigned"}{" "}
                      ·{" "}
                      {all.find((c) => c.id === r.customerId)?.company ||
                        "Internal"}
                    </p>
                    <small>
                      {r.bookingType || "Legacy appointment"} · {r.location}
                    </small>
                  </div>
                  <Status>{r.status}</Status>
                  <button onClick={() => open(r)}>Manage</button>
                </article>
              ))}
          </div>
          {!shown.length && (
            <Empty>
              No appointments match this diary. Use Book appointment to arrange
              a visit or reserve a resource.
            </Empty>
          )}
        </>
      )}
      {editor && (
        <Modal
          title={editor.id ? "Reschedule appointment" : "New appointment"}
          onClose={() => setEditor(null)}
        >
          <form onSubmit={save}>
            <label>
              Appointment title
              <input
                required
                maxLength={100}
                value={editor.title}
                onChange={(e) =>
                  setEditor({ ...editor, title: e.target.value })
                }
              />
            </label>
            <label>
              Appointment type
              <select
                value={editor.bookingType || "Customer visit"}
                onChange={(e) =>
                  setEditor({ ...editor, bookingType: e.target.value })
                }
              >
                {[
                  "Customer visit",
                  "Staff appointment",
                  "Room booking",
                  "Equipment booking",
                  "Site inspection",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Customer
              <select
                aria-label="Customer"
                required={editor.bookingType === "Customer visit"}
                value={editor.customerId || ""}
                onChange={(e) =>
                  setEditor({ ...editor, customerId: e.target.value })
                }
              >
                <option value="">Internal / no customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-pair">
              <label>
                Start
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
                End
                <input
                  type="datetime-local"
                  required
                  value={editor.endTime || ""}
                  onChange={(e) =>
                    setEditor({ ...editor, endTime: e.target.value })
                  }
                />
              </label>
            </div>
            <StaffAssignment
              label="Staff member"
              kind={
                editor.bookingType === "Site inspection"
                  ? "inspections"
                  : "bookings"
              }
              required
              records={all}
              orgId={org.id}
              startTime={editor.startTime}
              endTime={editor.endTime}
              excludedRecordId={editor.id}
              value={[editor.personId].filter(Boolean)}
              onChange={(v) => setEditor({ ...editor, personId: v[0] || "" })}
            />
            <ResourceAssignment
              records={all}
              label="Reserved resources"
              value={editor.resourceIds || []}
              onChange={(v) => setEditor({ ...editor, resourceIds: v })}
            />
            <label>
              Appointment notes
              <textarea
                value={editor.detail || ""}
                onChange={(e) =>
                  setEditor({ ...editor, detail: e.target.value })
                }
              />
            </label>
            {notice && <p role="alert">{notice}</p>}
            <button disabled={busy}>Save appointment</button>
          </form>
        </Modal>
      )}
      {current && (
        <Modal title="Appointment details" onClose={() => setSelected("")}>
          <h3>{current.title}</h3>
          <p>
            {current.startTime?.replace("T", " ")} →{" "}
            {current.endTime?.replace("T", " ")}
          </p>
          <p>{current.detail}</p>
          <Status>{current.status}</Status>
          <p>
            Staff:{" "}
            {staff.find((p) => p.id === current.personId)?.title ||
              current.owner ||
              "Unassigned"}
          </p>
          {current.customerId && (
            <button
              onClick={() => {
                const c = customers.find((c) => c.id === current.customerId);
                if (c) onNavigate(c.module, { recordId: c.id });
              }}
            >
              Open CRM customer
            </button>
          )}
          {canEdit && !["Complete", "Cancelled"].includes(current.status) && (
            <>
              <button onClick={() => start(current)}>
                Reschedule appointment
              </button>
              <button onClick={() => change({ status: "Cancelled" })}>
                Cancel appointment
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  change({
                    status: "Complete",
                    outcome: String(
                      new FormData(e.currentTarget).get("outcome"),
                    ).trim(),
                    completedAt: new Date().toISOString(),
                  });
                }}
              >
                <label>
                  Appointment outcome
                  <textarea name="outcome" required maxLength={1000} />
                </label>
                <button>Complete appointment</button>
              </form>
            </>
          )}
          {current.outcome && (
            <p className="schedule-notice">Outcome: {current.outcome}</p>
          )}
          {current.status === "Complete" && canCreate && taskModuleFor(org) && (
            <form onSubmit={followUp}>
              <h3>Follow-up task</h3>
              <label>
                Follow-up title
                <input
                  name="title"
                  required
                  defaultValue={"Follow up: " + current.title}
                />
              </label>
              <label>
                Follow-up due
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={today()}
                  required
                />
              </label>
              <button disabled={busy}>
                {all.some((r) => r.followUpForId === current.id)
                  ? "Open follow-up task"
                  : "Create follow-up task"}
              </button>
            </form>
          )}
          {(current.activity || []).map((a) => (
            <p className="task-note" key={a.id}>
              {a.at} · {a.action} · {a.details}
            </p>
          ))}
          {notice && <p role="alert">{notice}</p>}
        </Modal>
      )}
      <p className="module-disclaimer">
        Local scheduling only. No external calendar invitation, email or payment
        is sent.
      </p>
    </div>
  );
}
