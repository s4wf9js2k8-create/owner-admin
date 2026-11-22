import React, { useState } from "react";
import { modules, toggleModule } from "../model";
import { illustrativeAmount } from "./rules";
export default function PackageEditor({ controller: c }) {
  const [selected, setSelected] = useState(c.plans[0]?.name || ""),
    [message, setMessage] = useState("");
  const plan = c.plans.find((p) => p.name === selected),
    o = c.active;
  return (
    <div className="owner-package-editor">
      <details>
        <summary>Edit package pricing, allowances and add-ons</summary>
        <label>
          Package to edit
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {c.plans.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
        </label>
        {plan && (
          <form
            key={plan.name}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                v = Object.fromEntries(f);
              let included = [];
              for (const name of f.getAll("included"))
                if (!included.includes(name))
                  included = toggleModule(included, name);
              const addons = modules
                .filter(
                  (m) =>
                    Number(f.get("addon:" + m.name)) > 0 &&
                    !included.includes(m.name),
                )
                .map((m) => ({
                  module: m.name,
                  monthly: Number(f.get("addon:" + m.name)),
                }));
              const next = {
                ...plan,
                description: v.description,
                monthly: Number(v.monthly),
                annual: Number(v.annual),
                userAllowance: Number(v.users),
                storageMB: Number(v.storage),
                trial: Number(v.trial),
                support: v.support,
                includedModules: included,
                addons,
              };
              if (
                await c.setPlans(
                  c.plans.map((p) => (p.name === plan.name ? next : p)),
                )
              ) {
                await c.log("Edited package allowances: " + plan.name);
                setMessage(
                  "Package edited. Existing operational records and enabled modules are preserved; the configured price updates connected subscriptions.",
                );
              }
            }}
          >
            <label>
              Package description
              <textarea
                name="description"
                defaultValue={plan.description || ""}
              />
            </label>
            <div className="form-pair">
              {[
                ["monthly", "Monthly package price (£)", plan.monthly],
                ["annual", "Annual package price (£)", plan.annual],
                ["users", "Package user allowance", plan.userAllowance],
                ["storage", "Package storage allowance (MB)", plan.storageMB],
                ["trial", "Package trial days", plan.trial],
              ].map(([name, label, value]) => (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    type="number"
                    min="0"
                    max="1000000"
                    step={name === "monthly" || name === "annual" ? ".01" : "1"}
                    required
                    defaultValue={value || 0}
                  />
                </label>
              ))}
            </div>
            <label>
              Package support level
              <select name="support" defaultValue={plan.support || "Standard"}>
                <option>Standard</option>
                <option>Priority</option>
                <option>Bespoke</option>
              </select>
            </label>
            <label>
              Included package modules
              <select
                name="included"
                multiple
                size="6"
                defaultValue={plan.includedModules || []}
              >
                {modules.map((m) => (
                  <option key={m.name}>{m.name}</option>
                ))}
              </select>
            </label>
            <details>
              <summary>Optional add-on monthly prices</summary>
              <p>
                Zero means unavailable as a priced add-on. Included modules are
                excluded from add-on charges. Annual add-ons use twelve monthly
                charges.
              </p>
              {modules.map((m) => (
                <label key={m.name}>
                  {m.name} (£ / month)
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step=".01"
                    name={"addon:" + m.name}
                    defaultValue={
                      plan.addons?.find((a) => a.module === m.name)?.monthly ||
                      0
                    }
                  />
                </label>
              ))}
            </details>
            <button>Save package changes</button>
          </form>
        )}
      </details>
      <details>
        <summary>Company add-ons and subscription period ledger</summary>
        <p>Selected company: {o.name}. No real billing or money collection.</p>
        <form
          key={o.id + o.plan}
          onSubmit={async (e) => {
            e.preventDefault();
            const ids = new FormData(e.currentTarget).getAll("addon");
            let enabled = [...o.modules];
            for (const name of ids)
              if (!enabled.includes(name))
                enabled = toggleModule(enabled, name);
            if (
              await c.update(
                o.id,
                { subscriptionAddons: ids, modules: enabled },
                "Changed illustrative subscription add-ons",
              )
            ) {
              setMessage(
                "Add-on pricing and module access updated. Removing an add-on keeps its historical records and module access until explicitly disabled.",
              );
            }
          }}
        >
          {(c.plans.find((p) => p.name === o.plan)?.addons || []).map((a) => (
            <label className="task-check" key={a.module}>
              <input
                type="checkbox"
                name="addon"
                value={a.module}
                defaultChecked={o.subscriptionAddons?.includes(a.module)}
              />
              {a.module} · £{a.monthly.toFixed(2)} / month
            </label>
          ))}
          <button>Apply company add-ons</button>
        </form>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form));
            if (f.end < f.start) {
              setMessage("Period end must follow its start.");
              return;
            }
            if (
              (o.billingPeriods || []).some(
                (p) => p.start <= f.end && p.end >= f.start,
              )
            ) {
              setMessage("Subscription billing periods must not overlap.");
              return;
            }
            const amount = illustrativeAmount(o, c.plans);
            if (amount === null) {
              setMessage("Configure a valid package first.");
              return;
            }
            if (
              await c.update(
                o.id,
                {
                  billingPeriods: [
                    ...(o.billingPeriods || []),
                    {
                      id: crypto.randomUUID(),
                      ...f,
                      amount,
                      cycle: o.cycle,
                      package: o.plan,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                },
                "Recorded illustrative subscription period",
              )
            ) {
              form.reset();
              setMessage(
                "Period recorded using the current configured price. No invoice was issued.",
              );
            }
          }}
        >
          <div className="form-pair">
            <label>
              Billing period starts
              <input type="date" name="start" required />
            </label>
            <label>
              Billing period ends
              <input type="date" name="end" required />
            </label>
          </div>
          <button>Record illustrative billing period</button>
        </form>
        {(o.billingPeriods || []).map((p) => {
          const paid = (o.illustrativePayments || [])
            .filter((t) => t.date >= p.start && t.date <= p.end)
            .reduce((n, t) => n + Number(t.amount || 0), 0);
          return (
            <article className="task-note" key={p.id}>
              {p.start} – {p.end} · {p.package} · £{p.amount.toFixed(2)}{" "}
              expected · £{paid.toFixed(2)} recorded · £
              {Math.max(0, p.amount - paid).toFixed(2)} balance
              {paid > p.amount
                ? " · £" + (paid - p.amount).toFixed(2) + " unallocated excess"
                : ""}
            </article>
          );
        })}
      </details>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
