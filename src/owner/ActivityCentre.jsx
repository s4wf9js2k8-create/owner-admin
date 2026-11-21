import React, { useState } from "react";
export default function ActivityCentre({ controller: c }) {
  const [company, setCompany] = useState(""),
    [action, setAction] = useState(""),
    [date, setDate] = useState("");
  const rows = c.logs.filter(
    (l) =>
      (!company || l.orgId === company) &&
      (!action || l.event.toLowerCase().includes(action.toLowerCase())) &&
      (!date || l.at?.startsWith(date)),
  );
  return (
    <div>
      <span className="eyebrow">OWNER ACTIVITY CENTRE</span>
      <h2>Administrative timeline</h2>
      <div className="customer-tools">
        <label>
          Company filter
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">All companies</option>
            {c.orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Action filter
          <input value={action} onChange={(e) => setAction(e.target.value)} />
        </label>
        <label>
          Activity date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      {rows.map((l) => (
        <article className="owner-activity" key={l.id}>
          <small>
            {l.at || l.time} · {l.actorName || "Legacy fictional operator"} ·{" "}
            {l.role || "Demo"}
          </small>
          <h3>{l.event}</h3>
          <p>
            {c.orgs.find((o) => o.id === l.orgId)?.name} ·{" "}
            {l.module || "Owner administration"}
          </p>
        </article>
      ))}
      {!rows.length && <p>No activity matches the selected filters.</p>}
      <p className="module-disclaimer">
        Browser-session activity resets with the demo and is not a secure audit
        ledger.
      </p>
    </div>
  );
}
