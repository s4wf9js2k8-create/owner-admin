import React, { useEffect, useState } from "react";
import { Empty, Modal, Status } from "../components";
import { eligibleStaff } from "../staffEligibility";
import { StaffSelect, teamMembers } from "../LinkedSelectors";
import { LinkedRecordFiles } from "../RecordFiles";
import { moduleInfo } from "../customerModules";
import { taskModuleFor, firstModuleOfType } from "../customerWorkflows";
import { financialStatus, balancePence, money } from "../financialRules";
const stages = ["Lead", "Qualified", "Proposal", "Customer"];
const today = () => new Date().toISOString().slice(0, 10);
export function customerTimeline(customer, records) {
  const linked = records.filter((r) => r.customerId === customer.id),
    entries = (customer.notes || []).map((n, i) => ({
      ...n,
      id: n.id || "note-" + i,
      title: n.kind || "Note",
    }));
  for (const r of linked) {
    const type = moduleInfo(r.module).type;
    entries.push({
      id: r.id,
      title:
        type === "finance"
          ? (r.reference ? r.reference + " · " : "") + r.title
          : r.title,
      text:
        type === "finance"
          ? financialStatus(r) +
            (r.recordType === "invoice"
              ? " · Outstanding " + money(balancePence(r))
              : "")
          : r.bookingStatus || r.status || "Recorded",
      at: r.createdAt || r.creationDate || r.startTime || "",
      record: r,
    });
    for (const [i, h] of (r.history || []).entries())
      entries.push({
        id: r.id + "-history-" + i,
        title: r.reference || r.title,
        text: h.text,
        at: h.at,
        record: r,
      });
    for (const p of r.payments || [])
      entries.push({
        id: p.id,
        title: "Fictional payment · " + (r.reference || r.title),
        text: money(p.amountPence) + " · " + p.reference,
        at: p.date,
        record: r,
      });
    for (const c of r.credits || [])
      entries.push({
        id: c.id,
        title: "Credit note · " + r.reference,
        text: money(c.amountPence) + " · " + c.reference,
        at: c.date,
        record: r,
      });
  }
  return entries.sort(
    (a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0),
  );
}
export default function CustomerDirectory({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onNavigate,
  canCreate = true,
  canEdit = true,
  focusId,
  createRequest,
}) {
  const all = records.filter((r) => r.orgId === org.id),
    customers = all.filter((r) => moduleInfo(r.module).type === "crm"),
    staff = teamMembers(all, org.id);
  const [taskDue, setTaskDue] = useState(today()),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All"),
    [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [tab, setTab] = useState("Overview"),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [editingContact, setEditingContact] = useState(null);
  const current = customers.find((c) => c.id === selected),
    finance = current
      ? all.filter(
          (r) =>
            r.customerId === current.id &&
            moduleInfo(r.module).type === "finance",
        )
      : [],
    linked = current ? all.filter((r) => r.customerId === current.id) : [];
  useEffect(() => {
    if (focusId) {
      setSelected(focusId);
      setTab("Overview");
    }
  }, [focusId]);
  useEffect(() => {
    if (createRequest) setCreating(true);
  }, [createRequest]);
  const save = async (e, source) => {
    e.preventDefault();
    if (busy) return;
    const f = Object.fromEntries(new FormData(e.currentTarget)),
      name = f.company.trim();
    if (!name) return;
    setBusy(true);
    const owner = staff.find((p) => p.title === f.owner),
      contacts = source?.contacts || [];
    const fields = {
      title: name,
      company: name,
      contact: f.contact || source?.contact || "",
      email: f.email,
      telephone: f.telephone,
      detail: f.detail || "",
      ownerId: owner?.id || "",
      owner: f.owner || "",
      dueDate: f.dueDate || "",
      stage: f.stage || source?.stage || "Lead",
    };
    const saved = source
      ? await onUpdate(org.id, source.id, fields)
      : await onAdd({
          ...fields,
          orgId: org.id,
          module,
          recordType: "customer",
          contacts: f.contact
            ? [
                ...contacts,
                {
                  id: crypto.randomUUID(),
                  name: f.contact,
                  email: f.email,
                  telephone: f.telephone,
                  jobTitle: "Primary contact",
                },
              ]
            : contacts,
          status: "Planned",
          notes: [],
          createdAt: new Date().toISOString(),
        });
    setBusy(false);
    if (saved) {
      setCreating(false);
      setEditing(false);
      setNotice("Customer details saved. Linked records use this customer ID.");
    }
  };
  const editForm = (source) => (
    <form onSubmit={(e) => save(e, source)}>
      <label>
        Company name
        <input
          name="company"
          defaultValue={source?.company || source?.title || ""}
          required
          maxLength={100}
        />
      </label>
      {!source && (
        <label>
          Contact name
          <input name="contact" maxLength={100} />
        </label>
      )}
      <div className="form-pair">
        <label>
          Email
          <input name="email" type="email" defaultValue={source?.email || ""} />
        </label>
        <label>
          Telephone
          <input name="telephone" defaultValue={source?.telephone || ""} />
        </label>
      </div>
      <StaffSelect
        people={staff}
        label="Account manager"
        name="owner"
        value={
          source?.ownerId
            ? staff.find((p) => p.id === source.ownerId)?.title
            : source?.owner || ""
        }
      />
      <label>
        Relationship stage
        <select name="stage" defaultValue={source?.stage || "Lead"}>
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Next follow-up
        <input
          name="dueDate"
          type="date"
          defaultValue={source?.dueDate || ""}
        />
      </label>
      <label>
        Company notes
        <textarea name="detail" defaultValue={source?.detail || ""} />
      </label>
      <button disabled={busy}>
        {source ? "Save customer changes" : "Create company"}
      </button>
      {source && (
        <button type="button" onClick={() => setEditing(false)}>
          Cancel editing
        </button>
      )}
    </form>
  );
  const timeline = current ? customerTimeline(current, all) : [];
  const timelineView = (entries) => (
    <div className="crm-timeline">
      {entries.map((n) => (
        <article key={n.id}>
          <small>
            {n.at
              ? new Date(n.at).toLocaleString("en-GB")
              : "Legacy date not recorded"}
          </small>
          <h4>{n.title}</h4>
          <p>{n.text}</p>
          {n.record && (
            <button
              onClick={() =>
                onNavigate(
                  moduleInfo(n.record.module).type === "projects"
                    ? "Tasks & projects"
                    : n.record.module,
                  { recordId: n.record.id },
                )
              }
            >
              Open linked record
            </button>
          )}
        </article>
      ))}
      {!entries.length && (
        <Empty>No activity recorded. Log a call or create a linked task.</Empty>
      )}
    </div>
  );
  const shown = customers.filter(
    (c) =>
      (filter === "All" || c.stage === filter) &&
      [c.company, c.title, c.contact, ...(c.contacts || []).map((p) => p.name)]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="crm-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">CUSTOMER RELATIONSHIPS</span>
          <h2>Customers & CRM</h2>
          <p>
            Contacts, conversations, follow-ups and commercial history in one
            customer dossier.
          </p>
        </div>
        {canCreate && (
          <button className="action-primary" onClick={() => setCreating(true)}>
            Add company
          </button>
        )}
      </div>
      <div className="crm-layout">
        <section className="crm-follow-ups">
          <h3>Follow-ups requiring attention</h3>
          {customers
            .filter((c) => c.dueDate && c.dueDate <= today())
            .map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelected(c.id);
                  setTab("Tasks");
                }}
              >
                {c.company || c.title}
                <small>Follow-up due {c.dueDate}</small>
              </button>
            ))}
          {!customers.some((c) => c.dueDate && c.dueDate <= today()) && (
            <p>
              No customer follow-ups due. Set a date in a profile or create an
              assigned follow-up task.
            </p>
          )}
          <h3>Open customer tasks</h3>
          {all
            .filter(
              (r) =>
                r.customerId &&
                moduleInfo(r.module).type === "projects" &&
                r.status !== "Complete",
            )
            .map((r) => (
              <button
                key={r.id}
                onClick={() =>
                  onNavigate("Tasks & projects", { recordId: r.id })
                }
              >
                {r.title}
                <small>{r.dueDate || "No deadline"}</small>
              </button>
            ))}
        </section>
        <section>
          <div className="customer-tools">
            <label>
              Find customer
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Company or contact name"
              />
            </label>
            <label>
              Stage
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["All", ...stages].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="crm-directory">
            {shown.map((c) => (
              <article className="crm-company" key={c.id}>
                <div>
                  <span className="eyebrow">{c.stage || "Lead"}</span>
                  <h3>{c.company || c.title}</h3>
                  <p>
                    {c.contacts?.[0]?.name || c.contact || "No contacts yet"}
                  </p>
                  <small>
                    Account manager:{" "}
                    {staff.find((p) => p.id === c.ownerId)?.title ||
                      c.owner ||
                      "Unassigned"}{" "}
                    · {all.filter((r) => r.customerId === c.id).length} linked
                    records
                  </small>
                </div>
                <button
                  onClick={() => {
                    setSelected(c.id);
                    setTab("Overview");
                    setNotice("");
                  }}
                >
                  Open customer
                </button>
              </article>
            ))}
          </div>
          {!shown.length && (
            <Empty>
              No matching customers. Add a company to connect its appointments,
              bookings and quotations.
            </Empty>
          )}
        </section>
      </div>
      {creating && (
        <Modal title="New company" onClose={() => setCreating(false)}>
          {editForm()}
        </Modal>
      )}
      {current && (
        <Modal
          title="Customer profile"
          onClose={() => {
            setSelected("");
            setEditing(false);
            setEditingContact(null);
          }}
        >
          <div className="crm-profile">
            <header>
              <span className="eyebrow">CUSTOMER DOSSIER</span>
              <h2>{current.company || current.title}</h2>
              <Status>{current.stage || "Lead"}</Status>
            </header>
            <div className="profile-tabs">
              {[
                "Overview",
                "Contacts",
                "Activity",
                "Tasks",
                "Bookings & appointments",
                "Quotes & invoices",
                "Documents",
              ].map((t) => (
                <button
                  key={t}
                  aria-pressed={tab === t}
                  onClick={() => {
                    setTab(t);
                    setEditing(false);
                    setEditingContact(null);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "Overview" && (
              <>
                {editing ? (
                  editForm(current)
                ) : (
                  <>
                    <p>{current.detail}</p>
                    <p>
                      {current.email || "Email not recorded"} ·{" "}
                      {current.telephone || "Telephone not recorded"}
                    </p>
                    <p>
                      Account manager:{" "}
                      {staff.find((p) => p.id === current.ownerId)?.title ||
                        current.owner ||
                        "Unassigned"}
                    </p>
                    <p>Next follow-up: {current.dueDate || "Not scheduled"}</p>
                    {canEdit && (
                      <button onClick={() => setEditing(true)}>
                        Edit customer
                      </button>
                    )}
                    <h3>Recent activity and balances</h3>
                    {timelineView(timeline.slice(0, 12))}
                  </>
                )}
              </>
            )}
            {tab === "Contacts" && (
              <>
                <h3>Customer contacts</h3>
                {(current.contacts || []).map((c) => (
                  <article className="crm-contact" key={c.id}>
                    <h4>{c.name}</h4>
                    <p>
                      {c.jobTitle} · {c.email} · {c.telephone}
                    </p>
                    {canEdit && (
                      <button onClick={() => setEditingContact(c)}>
                        Edit contact
                      </button>
                    )}
                  </article>
                ))}
                {!current.contacts?.length && (
                  <p>
                    {current.contact
                      ? "Legacy contact: " +
                        current.contact +
                        ". Add a contact record below to use it in quotations."
                      : "No contacts recorded. Add the first contact below."}
                  </p>
                )}
                {canEdit && (
                  <form
                    key={editingContact?.id || "new"}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget,
                        f = Object.fromEntries(new FormData(form)),
                        c = {
                          ...f,
                          name: f.name.trim(),
                          id: editingContact?.id || crypto.randomUUID(),
                        };
                      if (!c.name) return;
                      const contacts = editingContact
                        ? (current.contacts || []).map((v) =>
                            v.id === c.id ? c : v,
                          )
                        : [...(current.contacts || []), c];
                      if (await onUpdate(org.id, current.id, { contacts })) {
                        setEditingContact(null);
                        form.reset();
                        setNotice(
                          "Contact saved. Quotations resolve this contact by ID.",
                        );
                      }
                    }}
                  >
                    <h3>{editingContact ? "Edit contact" : "Add contact"}</h3>
                    <label>
                      Contact name
                      <input
                        name="name"
                        required
                        defaultValue={editingContact?.name || ""}
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Job title
                      <input
                        name="jobTitle"
                        defaultValue={editingContact?.jobTitle || ""}
                      />
                    </label>
                    <label>
                      Contact email
                      <input
                        name="email"
                        type="email"
                        defaultValue={editingContact?.email || ""}
                      />
                    </label>
                    <label>
                      Contact telephone
                      <input
                        name="telephone"
                        defaultValue={editingContact?.telephone || ""}
                      />
                    </label>
                    <button>Save contact</button>
                    {editingContact && (
                      <button
                        type="button"
                        onClick={() => setEditingContact(null)}
                      >
                        Cancel contact edit
                      </button>
                    )}
                  </form>
                )}
              </>
            )}
            {tab === "Activity" && (
              <>
                {canEdit && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget,
                        f = Object.fromEntries(new FormData(form));
                      if (
                        await onUpdate(org.id, current.id, {
                          notes: [
                            ...(current.notes || []),
                            {
                              ...f,
                              text: f.text.trim(),
                              id: crypto.randomUUID(),
                              at: new Date().toISOString(),
                            },
                          ],
                        })
                      ) {
                        form.reset();
                        setNotice("Customer activity recorded locally.");
                      }
                    }}
                  >
                    <label>
                      Activity type
                      <select name="kind">
                        <option>Note</option>
                        <option>Call</option>
                        <option>Email (logged only)</option>
                        <option>Meeting</option>
                        <option>Opportunity</option>
                      </select>
                    </label>
                    <label>
                      What happened?
                      <textarea name="text" required maxLength={1000} />
                    </label>
                    <button>Add activity</button>
                  </form>
                )}
                {timelineView(timeline)}
              </>
            )}
            {tab === "Tasks" && (
              <>
                <h3>Customer follow-ups</h3>
                {linked
                  .filter((r) => moduleInfo(r.module).type === "projects")
                  .map((r) => (
                    <button
                      className="schedule-linked"
                      key={r.id}
                      onClick={() =>
                        onNavigate("Tasks & projects", { recordId: r.id })
                      }
                    >
                      {r.title} · {r.dueDate} · {r.status}
                    </button>
                  ))}
                {canCreate && taskModuleFor(org) && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (busy) return;
                      const form = e.currentTarget,
                        f = Object.fromEntries(new FormData(form));
                      setBusy(true);
                      const saved = await onAdd({
                        orgId: org.id,
                        module: taskModuleFor(org),
                        recordType: "task",
                        customerId: current.id,
                        title: f.title.trim(),
                        ownerId: f.ownerId,
                        owner:
                          staff.find((p) => p.id === f.ownerId)?.title || "",
                        dueDate: f.dueDate,
                        detail: "Customer follow-up: " + current.company,
                        priority: "Normal",
                        status: "Planned",
                      });
                      setBusy(false);
                      if (saved) {
                        form.reset();
                        setNotice(
                          "Follow-up task created and linked to this customer.",
                        );
                      }
                    }}
                  >
                    <label>
                      Follow-up task
                      <input name="title" required maxLength={100} />
                    </label>
                    <label>
                      Assigned employee
                      <select name="ownerId" required>
                        <option value="">Choose staff</option>
                        {eligibleStaff(all, org.id, {
                          kind: "projects",
                          date: taskDue,
                        }).eligible.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Due date
                      <input
                        name="dueDate"
                        type="date"
                        required
                        value={taskDue}
                        onChange={(e) => setTaskDue(e.target.value)}
                      />
                    </label>
                    <button disabled={busy}>Create customer task</button>
                  </form>
                )}
              </>
            )}
            {tab === "Bookings & appointments" && (
              <>
                <h3>Visits, reservations and jobs</h3>
                {linked
                  .filter((r) =>
                    ["bookings", "events", "maintenance"].includes(
                      moduleInfo(r.module).type,
                    ),
                  )
                  .map((r) => (
                    <button
                      className="schedule-linked"
                      key={r.id}
                      onClick={() => onNavigate(r.module, { recordId: r.id })}
                    >
                      {r.title} ·{" "}
                      {r.startTime?.replace("T", " ") ||
                        r.dueDate ||
                        "Date not set"}{" "}
                      · {r.bookingStatus || r.status}
                    </button>
                  ))}
                {!linked.some((r) =>
                  ["bookings", "events", "maintenance"].includes(
                    moduleInfo(r.module).type,
                  ),
                ) && (
                  <Empty>
                    No customer visits, bookings or jobs are linked yet.
                  </Empty>
                )}
              </>
            )}
            {tab === "Quotes & invoices" && (
              <>
                <h3>Commercial documents</h3>
                {finance.map((q) => (
                  <button
                    className="schedule-linked"
                    key={q.id}
                    onClick={() => onNavigate(q.module, { recordId: q.id })}
                  >
                    {q.reference || q.title} · {financialStatus(q)}
                    {q.recordType === "invoice"
                      ? " · Outstanding " + money(balancePence(q))
                      : ""}
                  </button>
                ))}
                {canCreate && firstModuleOfType(org, "finance") && (
                  <button
                    onClick={() =>
                      onNavigate(firstModuleOfType(org, "finance"), {
                        create: true,
                        customerId: current.id,
                      })
                    }
                  >
                    Start customer quotation
                  </button>
                )}
                {!finance.length && (
                  <p>No financial documents for this customer.</p>
                )}
              </>
            )}
            {tab === "Documents" && (
              <LinkedRecordFiles
                record={current}
                records={all}
                onNavigate={onNavigate}
              />
            )}
            {notice && (
              <p role="status" className="schedule-notice">
                {notice}
              </p>
            )}
          </div>
        </Modal>
      )}
      {notice && !current && <p role="status">{notice}</p>}
      <p className="module-disclaimer">
        Fictional customer records. Calls and emails are local activity entries;
        no external messages are sent.
      </p>
    </div>
  );
}
