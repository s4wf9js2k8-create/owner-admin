import React, { useState } from "react";
import { modules, toggleModule } from "../model";
import { illustrativeAmount } from "./rules";
export default function CommercialControls({ controller: c }) {
  const [message, setMessage] = useState(""),
    o = c.active,
    plan = c.plans.find((p) => p.name === o.plan);
  return (
    <div className="owner-commercial-controls">
      <details>
        <summary>Create a standard or bespoke package</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = new FormData(form),
              v = Object.fromEntries(f);
            if (
              c.plans.some(
                (p) => p.name.toLowerCase() === v.name.trim().toLowerCase(),
              )
            ) {
              setMessage("A package with that name already exists.");
              return;
            }
            let included = [];
            for (const name of f.getAll("included"))
              if (!included.includes(name))
                included = toggleModule(included, name);
            if (
              await c.setPlans([
                ...c.plans,
                {
                  name: v.name.trim(),
                  description: v.description,
                  monthly: Number(v.monthly),
                  annual: Number(v.annual),
                  trial: Number(v.trial),
                  userAllowance: Number(v.users),
                  storageMB: Number(v.storage),
                  support: v.support,
                  includedModules: included,
                },
              ])
            ) {
              await c.log("Package created: " + v.name);
              setMessage(
                "Package saved. Select it in Subscription configuration to assign it.",
              );
              form.reset();
            }
          }}
        >
          <label>
            Package name
            <input name="name" required maxLength={60} pattern=".*\S.*" />
          </label>
          <label>
            Description
            <textarea name="description" />
          </label>
          <div className="form-pair">
            {[
              ["monthly", "Monthly illustrative price (£)", 100000],
              ["annual", "Annual illustrative price (£)", 100000],
              ["trial", "Trial days", 90],
              ["users", "User allowance", 100000],
              ["storage", "Storage allowance (MB)", 1000000],
            ].map(([n, l, max]) => (
              <label key={n}>
                {l}
                <input
                  name={n}
                  type="number"
                  min="0"
                  max={max}
                  step="1"
                  required
                  defaultValue={n === "trial" ? 14 : 0}
                />
              </label>
            ))}
          </div>
          <label>
            Support level
            <select name="support">
              <option>Standard</option>
              <option>Priority</option>
              <option>Bespoke</option>
            </select>
          </label>
          <label>
            Included modules
            <select name="included" multiple size="6">
              {modules.map((m) => (
                <option key={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          <button>Create package</button>
        </form>
      </details>
      <details>
        <summary>Subscription dates, status and negotiated price</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (f.renewalDate && f.startDate && f.renewalDate < f.startDate) {
              setMessage("Renewal must be on or after start.");
              return;
            }
            const status = f.subscriptionStatus;
            const patch = {
              ...f,
              negotiatedPrice:
                f.negotiatedPrice === "" ? "" : Number(f.negotiatedPrice),
              status:
                status === "Trial"
                  ? "Trial"
                  : ["Cancelled", "Suspended"].includes(status)
                    ? "Suspended"
                    : "Active",
            };
            if (status !== (o.subscriptionStatus || o.status)) {
              c.setConfirm({ id: o.id, ...patch });
              return;
            }
            if (
              await c.update(
                o.id,
                patch,
                "Updated fictional subscription dates/pricing",
              )
            )
              setMessage("Subscription details updated.");
          }}
        >
          <label>
            Subscription state
            <select
              name="subscriptionStatus"
              defaultValue={o.subscriptionStatus || o.status}
            >
              {["Trial", "Active", "Past due", "Suspended", "Cancelled"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              defaultValue={o.startDate || ""}
            />
          </label>
          <label>
            Renewal date
            <input
              name="renewalDate"
              type="date"
              defaultValue={o.renewalDate || ""}
            />
          </label>
          <label>
            Negotiated base amount (£ per selected billing period)
            <input
              name="negotiatedPrice"
              type="number"
              min="0"
              max="1000000"
              step=".01"
              defaultValue={o.negotiatedPrice ?? ""}
            />
          </label>
          <button>Review subscription changes</button>
        </form>
        <p>
          Configured amount: £
          {illustrativeAmount(o, c.plans)?.toFixed(2) ?? "Unavailable"} /{" "}
          {o.cycle}. No money is collected.
        </p>
        <p>
          Package allowance: {plan?.userAllowance ?? "Not configured"} users ·{" "}
          {plan?.storageMB ?? "Not configured"} MB ·{" "}
          {plan?.includedModules?.length || 0} included modules.
        </p>
      </details>
      <details>
        <summary>Record an illustrative payment</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await c.update(
                o.id,
                {
                  illustrativePayments: [
                    ...(o.illustrativePayments || []),
                    {
                      ...f,
                      id: crypto.randomUUID(),
                      amount: Number(f.amount),
                      at: new Date().toISOString(),
                    },
                  ],
                },
                "Recorded illustrative subscription payment",
              )
            )
              setMessage(
                "Fictional payment recorded. No real transaction took place.",
              );
          }}
        >
          <label>
            Payment date
            <input name="date" type="date" required />
          </label>
          <label>
            Illustrative payment amount (£)
            <input name="amount" type="number" min=".01" step=".01" required />
          </label>
          <label>
            Payment reference
            <input name="reference" required />
          </label>
          <button>Record fictional payment</button>
        </form>
        {(o.illustrativePayments || []).map((p) => (
          <p key={p.id}>
            {p.date} · £{p.amount.toFixed(2)} · {p.reference} · Fictional record
            only
          </p>
        ))}
      </details>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
