import React, { useState } from "react";
import { Modal, Empty } from "../components";
export default function SupportPage({ controller: c }) {
  const [creating, setCreating] = useState(false),
    [company, setCompany] = useState(""),
    [priority, setPriority] = useState("All"),
    [queue, setQueue] = useState("All"),
    [search, setSearch] = useState(""),
    [message, setMessage] = useState("");
  const { ticket, tickets, orgs, active } = c,
    rows = tickets.filter(
      (t) =>
        (!company || t.orgId === company) &&
        (priority === "All" || t.priority === priority) &&
        (queue === "All" || t.status === queue) &&
        t.subject.toLowerCase().includes(search.toLowerCase()),
    );
  const create = async (values) => {
    let t;
    if (
      await c.run(async () => {
        t = await c.backend.supportTickets.create(values.orgId, {
          ...values,
          createdAt: new Date().toISOString(),
          status: "Open",
          history: [],
        });
      })
    ) {
      c.setTicketId(t.id);
      await c.log("Created support ticket: " + t.subject, t.orgId);
      setCreating(false);
    }
  };
  const response = (t) => {
      const start = Date.parse(t.createdAt),
        at = (t.history || [])
          .filter((h) => h.kind !== "Internal note")
          .map((h) => Date.parse(h.at))
          .filter((n) => Number.isFinite(n) && n >= start)
          .sort((a, b) => a - b)[0];
      return Number.isFinite(at) ? (at - start) / 60000 : null;
    },
    responses = tickets.map(response).filter((n) => n !== null),
    resolutions = tickets
      .map((t) => (Date.parse(t.resolvedAt) - Date.parse(t.createdAt)) / 60000)
      .filter((n) => Number.isFinite(n) && n >= 0),
    average = (a) =>
      a.length
        ? (a.reduce((n, v) => n + v, 0) / a.length).toFixed(1) + " minutes"
        : "Unavailable (no timestamped records)";
  return (
    <div className="owner-support">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">CUSTOMER SERVICE</span>
          <h2>Support inbox</h2>
          <p>
            {
              tickets.filter((t) => !["Closed", "Resolved"].includes(t.status))
                .length
            }{" "}
            open tickets ·{" "}
            {
              tickets.filter(
                (t) =>
                  t.priority === "Urgent" &&
                  !["Closed", "Resolved"].includes(t.status),
              ).length
            }{" "}
            unresolved urgent
          </p>
        </div>
        <div>
          <button onClick={() => setCreating(true)}>
            Create support ticket
          </button>
          <button
            onClick={() =>
              create({
                orgId: active.id,
                subject: "Sample request " + (tickets.length + 1),
                priority: "Normal",
              })
            }
          >
            Add example ticket
          </button>
        </div>
      </div>
      <details>
        <summary>Supported response metrics</summary>
        <p>Average first recorded response: {average(responses)}</p>
        <p>Average recorded resolution: {average(resolutions)}</p>
        <p>
          Legacy or missing timestamps are excluded. No delivery or
          service-level compliance is implied.
        </p>
      </details>
      <div className="customer-tools">
        <label>
          Search support
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Customer filter
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">All customers</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority filter
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {["All", "Low", "Normal", "High", "Urgent"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Queue
          <select value={queue} onChange={(e) => setQueue(e.target.value)}>
            {[
              "All",
              "Open",
              "In progress",
              "Waiting",
              "Waiting for customer",
              "Resolved",
              "Closed",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="owner-support-layout">
        <section aria-label="Support ticket inbox">
          {rows.map((t) => (
            <button
              className="owner-row"
              key={t.id}
              onClick={() => c.setTicketId(t.id)}
            >
              <strong>{t.subject}</strong>
              <small>
                {orgs.find((o) => o.id === t.orgId)?.name} · {t.priority} ·{" "}
                {t.status}
              </small>
              <small>Assigned: {t.assignee || "Unassigned"}</small>
            </button>
          ))}
          {!rows.length && (
            <Empty>No tickets match the selected filters.</Empty>
          )}
        </section>
        {ticket && (
          <article className="panel">
            <h2>{ticket.subject}</h2>
            <small>
              Ticket {ticket.id} ·{" "}
              {orgs.find((o) => o.id === ticket.orgId)?.name}
            </small>
            <p>{ticket.description || "Legacy description not recorded"}</p>
            <div className="form-pair">
              <label>
                Priority
                <select
                  aria-label="Priority"
                  value={ticket.priority}
                  onChange={(e) => c.changeTicket({ priority: e.target.value })}
                >
                  {["Low", "Normal", "High", "Urgent"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Ticket status
                <select
                  aria-label="Ticket status"
                  value={ticket.status}
                  onChange={(e) => c.changeTicket({ status: e.target.value })}
                >
                  {[
                    "Open",
                    "In progress",
                    "Waiting",
                    "Waiting for customer",
                    "Resolved",
                    "Closed",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Assigned support person
                <select
                  aria-label="Assigned support person"
                  value={ticket.assignee || ""}
                  onChange={(e) => c.changeTicket({ assignee: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  <option>Fictional platform owner</option>
                  <option>Fictional support agent</option>
                  <option>Fictional implementation lead</option>
                </select>
              </label>
              <label>
                Affected module
                <select
                  value={ticket.module || ""}
                  onChange={(e) => c.changeTicket({ module: e.target.value })}
                >
                  <option value="">Platform / general</option>
                  {orgs
                    .find((o) => o.id === ticket.orgId)
                    ?.modules.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                </select>
              </label>
            </div>
            <h3>Communication history</h3>
            {ticket.history.map((h, i) => (
              <div className="history" key={i}>
                <small>
                  {h.kind} · {h.at || h.time}
                </small>
                <p>{h.text}</p>
              </div>
            ))}
            {!ticket.history.length && <Empty>No messages yet.</Empty>}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = new FormData(form),
                  text = String(f.get("note")).trim();
                if (!text) return;
                await c.changeTicket({
                  history: [
                    ...ticket.history,
                    {
                      kind: f.get("kind"),
                      text,
                      time: new Date().toLocaleString("en-GB"),
                      at: new Date().toISOString(),
                    },
                  ],
                });
                form.reset();
              }}
            >
              <label>
                Entry type
                <select name="kind">
                  <option>Internal note</option>
                  <option>Simulated customer reply (not sent)</option>
                </select>
              </label>
              <label>
                Fictional message
                <textarea name="note" required maxLength={1500} />
              </label>
              <button>Add local entry</button>
            </form>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const resolution = String(
                  new FormData(e.currentTarget).get("resolution"),
                ).trim();
                await c.changeTicket({
                  status: "Resolved",
                  resolution,
                  resolvedAt: new Date().toISOString(),
                });
                setMessage(
                  "Resolution recorded in this demo. No message sent.",
                );
              }}
            >
              <label>
                Resolution information
                <textarea
                  name="resolution"
                  required
                  defaultValue={ticket.resolution || ""}
                />
              </label>
              <button>Resolve ticket</button>
            </form>
            {["Resolved", "Closed"].includes(ticket.status) && (
              <button
                onClick={() =>
                  c.changeTicket({ status: "Open", resolvedAt: "" })
                }
              >
                Reopen ticket
              </button>
            )}
            <button onClick={() => c.navigate("Feature Requests")}>
              Open feature request backlog
            </button>
            {message && <p role="status">{message}</p>}
          </article>
        )}
      </div>
      {creating && (
        <Modal title="Create support ticket" onClose={() => setCreating(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create(Object.fromEntries(new FormData(e.currentTarget)));
            }}
          >
            <label>
              Ticket customer
              <select name="orgId" required>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ticket subject
              <input name="subject" required pattern=".*\S.*" />
            </label>
            <label>
              Description
              <textarea name="description" required />
            </label>
            <label>
              Initial priority
              <select name="priority">
                <option>Normal</option>
                <option>Low</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </label>
            <button>Create ticket</button>
          </form>
        </Modal>
      )}
      <p className="module-disclaimer">
        All support conversations are fictional session records. No emails or
        external responses are sent.
      </p>
    </div>
  );
}
