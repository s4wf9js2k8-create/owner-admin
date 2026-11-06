import React from "react";
import { Panel, Table, Status, Empty } from "../components";
export default function SubscriptionsPage({ controller }) {
  const {
    plans,
    setPlans,
    log,
    selected,
    setSelected,
    orgs,
    active,
    setConfirm,
    update,
  } = controller;
  return (
    <>
      <Panel title="Illustrative packages">
        <p>
          Sample GBP prices only, not commercial offers. No charges, invoices or
          payment processing occur.
        </p>
        <Table headings={["Package", "Monthly £", "Annual £", "Trial days"]}>
          {plans.map((p, i) => (
            <tr key={p.name}>
              <th scope="row">{p.name}</th>
              {["monthly", "annual", "trial"].map((k) => (
                <td key={k}>
                  <input
                    type="number"
                    min="0"
                    max={k === "trial" ? 90 : 100000}
                    step="1"
                    aria-label={p.name + " " + k}
                    value={p[k]}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (
                        Number.isInteger(n) &&
                        n >= 0 &&
                        n <= (k === "trial" ? 90 : 100000)
                      )
                        setPlans((old) =>
                          old.map((x, j) => (i === j ? { ...x, [k]: n } : x)),
                        );
                    }}
                    onBlur={() =>
                      log("Updated illustrative " + p.name + " pricing")
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel title="Subscription configuration">
        <label>
          Organisation
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <div className="profile-grid">
          <label>
            Package
            <select
              value={active.plan}
              onChange={(e) =>
                setConfirm({ id: active.id, plan: e.target.value })
              }
            >
              {plans.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Billing cycle
            <select
              value={active.cycle}
              onChange={(e) =>
                update(
                  active.id,
                  { cycle: e.target.value },
                  "Changed sample billing cycle",
                )
              }
            >
              {["Monthly", "Annual"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Trial ends
            <input
              type="date"
              value={active.trialEnds}
              onChange={(e) =>
                update(
                  active.id,
                  { trialEnds: e.target.value },
                  "Changed sample trial end",
                )
              }
            />
          </label>
        </div>
        <p>
          <Status>{active.status}</Status> · Illustrative fee: £
          {
            plans.find((p) => p.name === active.plan)[
              active.cycle === "Annual" ? "annual" : "monthly"
            ]
          }{" "}
          / {active.cycle === "Annual" ? "year" : "month"}
        </p>
      </Panel>
      <Panel title="Billing history">
        <Empty>
          No real billing history. Package changes appear in the local activity
          log; no invoices or payments have been created.
        </Empty>
      </Panel>
    </>
  );
}
