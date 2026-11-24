import React, { useState, useEffect } from "react";
import { moduleInfo } from "../customerModules";
import { Modal } from "../components";
import { exportCsv } from "./Shared";
const money = (n) => "£" + Number(n || 0).toFixed(2),
  day = () => new Date().toISOString().slice(0, 10);
export default function FundraisingWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  canCreate,
  canEdit,
  canExport,
  focusId,
  onNavigate,
}) {
  const rows = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "donations",
    ),
    campaigns = rows.filter((r) => r.recordType === "campaign"),
    donations = rows.filter((r) => r.recordType !== "campaign"),
    customers = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "crm",
    ),
    events = records.filter(
      (r) =>
        r.orgId === org.id &&
        moduleInfo(r.module).type === "events" &&
        r.recordType !== "booking",
    );
  const [source, setSource] = useState("All"),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState(""),
    [campaign, setCampaign] = useState("All"),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (focusId) setSelected(focusId);
  }, [focusId]);
  const current = rows.find((r) => r.id === selected),
    shown = donations.filter(
      (d) =>
        (source === "All" || d.module === source) &&
        (campaign === "All" ||
          d.campaignId === campaign ||
          (!d.campaignId &&
            d.campaign === campaigns.find((c) => c.id === campaign)?.title)),
    );
  return (
    <div className="completion-workspace fundraising-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">DONATIONS & FUNDRAISING</span>
          <h2>Campaigns and contributions</h2>
          <p>
            Fictional contribution records and reconciliation. No payments, Gift
            Aid claims or tax submissions are processed.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setCreating(true)}>Record donation</button>
        )}
      </div>
      <label>
        Source module
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option>All</option>
          {[...new Set(rows.map((r) => r.module))].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <div className="purpose-grid">
        {campaigns
          .filter((c) => source === "All" || c.module === source)
          .map((c) => {
            const amount = donations
              .filter(
                (d) =>
                  d.campaignId === c.id ||
                  (!d.campaignId && d.campaign === c.title),
              )
              .reduce((n, d) => n + Number(d.amount || 0), 0);
            return (
              <article className="purpose-card" key={c.id}>
                <span className="eyebrow">{c.status}</span>
                <h3>{c.title}</h3>
                <p>{c.detail}</p>
                <progress
                  value={amount}
                  max={Math.max(amount, Number(c.target) || 1)}
                />
                <p>
                  {money(amount)} of {money(c.target)} target
                </p>
                <button onClick={() => setCampaign(c.id)}>
                  View contributions
                </button>
                {canEdit && (
                  <button onClick={() => setSelected(c.id)}>
                    Edit campaign
                  </button>
                )}
              </article>
            );
          })}
      </div>
      {canCreate && (
        <details>
          <summary>Create fundraising campaign</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = Object.fromEntries(new FormData(form));
              if (
                await onAdd({
                  ...f,
                  orgId: org.id,
                  module,
                  recordType: "campaign",
                  target: Number(f.target),
                  status: "Active",
                })
              )
                form.reset();
            }}
          >
            <label>
              Campaign name
              <input name="title" required maxLength={100} />
            </label>
            <label>
              Fundraising purpose
              <textarea name="detail" required />
            </label>
            <label>
              Campaign target (£)
              <input
                name="target"
                type="number"
                min="0.01"
                step=".01"
                max="10000000"
                required
              />
            </label>
            <label>
              Related event
              <select name="eventId">
                <option value="">No event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            <button>Create campaign</button>
          </form>
        </details>
      )}
      <label>
        Contribution campaign
        <select value={campaign} onChange={(e) => setCampaign(e.target.value)}>
          <option>All</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <p>
        {shown.length} contributions ·{" "}
        {money(shown.reduce((n, d) => n + Number(d.amount || 0), 0))} ·{" "}
        {shown.filter((d) => d.reconciledAt).length} reconciled
      </p>
      {canExport && (
        <button
          onClick={() =>
            exportCsv("donations", [
              [
                "Date",
                "Campaign",
                "Donor",
                "Source",
                "Amount GBP",
                "Reference",
                "Reconciled",
              ],
              ...shown.map((d) => [
                d.date || d.dueDate,
                campaigns.find((c) => c.id === d.campaignId)?.title ||
                  d.campaign,
                customers.find((c) => c.id === d.customerId)?.title ||
                  "Anonymous",
                d.source,
                d.amount,
                d.reference,
                d.reconciledAt || "No",
              ]),
            ])
          }
        >
          Export donations CSV
        </button>
      )}
      <div className="completion-history">
        {shown.map((d) => (
          <article className="completion-entry" key={d.id}>
            <strong>{money(d.amount)}</strong> · {d.date || d.dueDate} ·{" "}
            {campaigns.find((c) => c.id === d.campaignId)?.title ||
              d.campaign ||
              "General fund"}
            <p>
              {customers.find((c) => c.id === d.customerId)?.title ||
                "Anonymous donor"}{" "}
              · {d.source} · {d.reconciledAt ? "Reconciled" : "Unreconciled"}
            </p>
            <button onClick={() => setSelected(d.id)}>Open donation</button>
          </article>
        ))}
      </div>
      {creating && (
        <Modal title="Record donation" onClose={() => setCreating(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                await onAdd({
                  ...f,
                  orgId: org.id,
                  module,
                  recordType: "donation",
                  title:
                    campaigns.find((c) => c.id === f.campaignId)?.title ||
                    "General fund",
                  amount: Number(f.amount),
                  dueDate: f.date,
                  status: "Complete",
                })
              )
                setCreating(false);
            }}
          >
            <label>
              Donation campaign
              <select required name="campaignId">
                <option value="">Choose campaign</option>
                {campaigns
                  .filter((c) => c.status === "Active")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Existing donor
              <select name="customerId">
                <option value="">Anonymous</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            {!customers.length && (
              <p>
                Enable CRM and add fictional donor profiles to select a named
                donor.
              </p>
            )}
            <label>
              Related fundraising event
              <select name="eventId">
                <option value="">No event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Donation date
              <input required type="date" name="date" defaultValue={day()} />
            </label>
            <label>
              Amount (£, fictional)
              <input
                required
                name="amount"
                type="number"
                min=".01"
                step=".01"
                max="10000000"
              />
            </label>
            <label>
              Donation source
              <select name="source">
                {[
                  "Collection box",
                  "Event",
                  "Cash (demo)",
                  "Bank (demo)",
                  "Card (demo)",
                  "Other",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Donation reference
              <input required name="reference" maxLength={100} />
            </label>
            <label>
              Notes
              <textarea name="detail" />
            </label>
            <button>Save donation</button>
          </form>
        </Modal>
      )}
      {current && (
        <Modal title={current.title} onClose={() => setSelected("")}>
          {current.recordType === "campaign" ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                if (
                  await onUpdate(org.id, current.id, {
                    ...f,
                    target: Number(f.target),
                  })
                )
                  setMessage("Campaign updated.");
              }}
            >
              <label>
                Campaign title
                <input name="title" required defaultValue={current.title} />
              </label>
              <label>
                Purpose
                <textarea
                  name="detail"
                  required
                  defaultValue={current.detail}
                />
              </label>
              <label>
                Target (£)
                <input
                  type="number"
                  name="target"
                  min=".01"
                  step=".01"
                  required
                  defaultValue={current.target}
                />
              </label>
              <label>
                Campaign status
                <select name="status" defaultValue={current.status}>
                  <option>Active</option>
                  <option>Complete</option>
                  <option>Cancelled</option>
                </select>
              </label>
              <button>Save campaign</button>
            </form>
          ) : (
            <>
              <h3>{money(current.amount)}</h3>
              <p>{current.detail}</p>
              <p>
                {current.source} · {current.reference || "No reference"}
              </p>
              {current.customerId && (
                <button
                  onClick={() => {
                    const c = customers.find(
                      (c) => c.id === current.customerId,
                    );
                    if (c) onNavigate(c.module, { recordId: c.id });
                  }}
                >
                  Open donor profile
                </button>
              )}
              {canEdit && !current.reconciledAt && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    if (
                      await onUpdate(org.id, current.id, {
                        reconciledAt: new Date().toISOString(),
                        reconciliationReference: f.reference,
                      })
                    )
                      setMessage(
                        "Reconciled against the recorded fictional reference. No funds moved.",
                      );
                  }}
                >
                  <label>
                    Reconciliation reference
                    <input name="reference" required maxLength={100} />
                  </label>
                  <button>Mark reconciled</button>
                </form>
              )}
              {current.reconciledAt && (
                <p>
                  Reconciled {current.reconciledAt} ·{" "}
                  {current.reconciliationReference}
                </p>
              )}
            </>
          )}
          {message && <p role="status">{message}</p>}
        </Modal>
      )}
    </div>
  );
}
