import React, { useEffect, useState } from "react";
import { Panel } from "./components";

const gib = (value) => (Number(value || 0) / 1024 ** 3).toFixed(2);
const percent = (used, quota) => quota > 0 ? Math.min(100, Math.round(100 * Number(used) / Number(quota))) : 0;

export default function ServerManagement({ client, storage, onRefresh, busy }) {
  const [health, setHealth] = useState("checking");
  const [checked, setChecked] = useState(null);
  const [failure, setFailure] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("name");
  useEffect(() => {
    let active = true;
    client.call("GET", "/health").then(() => {
      if (active) { setHealth("reachable"); setChecked(new Date()); setFailure(""); }
    }).catch(() => {
      if (active) { setHealth("unavailable"); setChecked(new Date()); setFailure("API health check failed. Database and host status cannot be inferred."); }
    });
    return () => { active = false; };
  }, [client, storage]);
  const rows = [...(storage?.companies || [])]
    .filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => sort === "usage"
      ? Number(b.used_bytes) - Number(a.used_bytes)
      : a.name.localeCompare(b.name));
  const used = (storage?.companies || []).reduce((sum, c) => sum + Number(c.used_bytes || 0), 0);
  const allocation = Number(storage?.allocation_bytes || 0);
  return (
    <section aria-label="Server Management">
      <Panel title="Server Management">
        <p>Private operator monitoring · live values come from this server only. No physical-host telemetry is connected.</p>
        <button type="button" disabled={busy} onClick={onRefresh}>Refresh monitoring</button>
        <p role="status">API: {health === "checking" ? "Checking…" : health === "reachable" ? "Responding" : "Unavailable"}
          {" · "}Last checked: {checked ? checked.toLocaleString() : "Not yet checked"}</p>
        {failure && <p role="alert">{failure}</p>}
        <div className="stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
          <div><strong>File allocation</strong><p>{storage ? gib(allocation) + " GiB" : "Unavailable"}</p></div>
          <div><strong>Recorded file usage</strong><p>{storage ? gib(used) + " GiB" : "Unavailable"}</p></div>
          <div><strong>Remaining allocation</strong><p>{storage ? gib(Math.max(0, allocation-used)) + " GiB" : "Unavailable"}</p></div>
          <div><strong>Companies</strong><p>{storage ? storage.companies.length : "Unavailable"}</p></div>
        </div>
        <p><small>Allocation is an application upload limit, not measured disk free space. Database, OS, logs and backups require additional storage.</small></p>
      </Panel>
      <Panel title="Company storage and quotas">
        <label>Find company <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search companies" /></label>
        <label>Sort <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="name">Company name</option><option value="usage">Most storage used</option>
        </select></label>
        {!storage ? <p role="status">Storage telemetry unavailable.</p> : rows.length === 0 ? <p>No matching companies.</p> : (
          <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}>
            <thead><tr><th>Company</th><th>Used</th><th>Quota</th><th>Usage</th><th>Alert</th></tr></thead>
            <tbody>{rows.map(c => {
              const pct = percent(c.used_bytes,c.quota_bytes);
              return <tr key={c.id}><td>{c.name}</td><td>{gib(c.used_bytes)} GiB</td><td>{gib(c.quota_bytes)} GiB</td>
                <td><progress value={pct} max="100" aria-label={c.name+" quota usage"} /> {pct}%</td>
                <td>{pct >= 90 ? "Critical: 90%+" : pct >= 75 ? "Warning: 75%+" : "Within quota"}</td></tr>;
            })}</tbody>
          </table></div>
        )}
      </Panel>
      <Panel title="Services, backups and alerts">
        <p><strong>API:</strong> {health === "reachable" ? "Responding" : health === "checking" ? "Checking" : "Unavailable"}</p>
        <p><strong>PostgreSQL:</strong> Not independently monitored</p>
        <p><strong>Host CPU, RAM and disk:</strong> Not connected</p>
        <p><strong>Backup history and restore tests:</strong> Not connected. Do not assume backups have run.</p>
        <p><strong>Alerts:</strong> {storage && storage.companies.some(c => percent(c.used_bytes,c.quota_bytes) >= 90)
          ? "One or more company quotas are at or above 90%." : "No critical quota alert from available data; other monitoring is unavailable."}</p>
        <p><small>Future host and backup monitoring requires authenticated read-only telemetry from the authorised VM. No shell or Docker control is exposed in this page.</small></p>
      </Panel>
    </section>
  );
}
