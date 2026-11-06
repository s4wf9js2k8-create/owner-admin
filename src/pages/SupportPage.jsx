import React from "react";
import { Panel, Table, Status, Empty } from "../components";
export default function SupportPage({ controller }) {
  const {
    active,
    tickets,
    backend,
    run,
    setTicketId,
    log,
    orgs,
    ticket,
    changeTicket,
  } = controller;
  return (
    <>
      <Panel title="Customer support">
        <button
          onClick={async () => {
            let t;
            if (
              !(await run(async () => {
                t = await backend.supportTickets.create(active.id, {
                  subject: "Sample request " + (tickets.length + 1),
                  priority: "Normal",
                  status: "Open",
                  history: [],
                });
              }))
            )
              return;
            setTicketId(t.id);
            log("Created sample support request", active.id);
          }}
        >
          Add example ticket
        </button>
        <Table headings={["Subject", "Organisation", "Priority", "Status"]}>
          {tickets.map((t) => (
            <tr key={t.id}>
              <th scope="row">
                <button onClick={() => setTicketId(t.id)}>{t.subject}</button>
              </th>
              <td>{orgs.find((o) => o.id === t.orgId)?.name}</td>
              <td>
                <Status>{t.priority}</Status>
              </td>
              <td>
                <Status>{t.status}</Status>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
      {ticket ? (
        <Panel title={ticket.subject}>
          <div className="profile-grid">
            <label>
              Priority
              <select
                value={ticket.priority}
                onChange={(e) => changeTicket({ priority: e.target.value })}
              >
                {["Low", "Normal", "High", "Urgent"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Ticket status
              <select
                value={ticket.status}
                onChange={(e) => changeTicket({ status: e.target.value })}
              >
                {["Open", "In progress", "Waiting", "Closed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <h3>Communication history</h3>
          {ticket.history.length ? (
            ticket.history.map((h, i) => (
              <div className="history" key={i}>
                <small>
                  {h.kind} · {h.time}
                </small>
                <p>{h.text}</p>
              </div>
            ))
          ) : (
            <Empty>No messages yet.</Empty>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                text = f.get("note").trim();
              if (!text) return;
              changeTicket({
                history: [
                  ...ticket.history,
                  {
                    kind: f.get("kind"),
                    text,
                    time: new Date().toLocaleString("en-GB"),
                  },
                ],
              });
              e.currentTarget.reset();
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
              <textarea name="note" required maxLength={500} />
            </label>
            <button type="submit">Add local entry</button>
          </form>
        </Panel>
      ) : (
        <Empty>No sample ticket selected.</Empty>
      )}
    </>
  );
}
