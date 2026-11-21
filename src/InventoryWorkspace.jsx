import React, { useState, useEffect } from "react";
import { Modal, Status } from "./components";
import { moduleInfo } from "./customerModules";
export default function InventoryWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onNavigate,
  focusId,
  canCreate,
  canEdit,
}) {
  const [selected, setSelected] = useState(null),
    [tab, setTab] = useState("Stock"),
    [create, setCreate] = useState(""),
    [message, setMessage] = useState(""),
    [mode, setMode] = useState("Receive"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (focusId) setSelected(focusId);
  }, [focusId]);
  const rows = records.filter((r) => r.module === module),
    items = rows.filter((r) => !r.recordType),
    suppliers = rows.filter((r) => r.recordType === "supplier"),
    orders = rows.filter((r) => r.recordType === "purchase-order"),
    jobs = records.filter((r) => moduleInfo(r.module).type === "maintenance"),
    item = items.find((r) => r.id === selected);
  const saveNew = async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (!f.title.trim()) return;
    setBusy(true);
    const r = await onAdd({
      orgId: org.id,
      module,
      ...f,
      title: f.title.trim(),
      ...(create === "Supplier"
        ? { recordType: "supplier" }
        : create === "Purchase order"
          ? {
              recordType: "purchase-order",
              delivered: 0,
              ordered: Number(f.ordered),
            }
          : {
              quantity: String(f.quantity || 0),
              reorder: Number(f.reorder || 0),
              unitCost: Number(f.unitCost || 0),
              movements: [],
            }),
      status: "Planned",
      createdAt: new Date().toISOString(),
    });
    setBusy(false);
    if (r) setCreate("");
  };
  const movement = async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    const ok = await onUpdate(org.id, item.id, {
      _stockMovement: { ...f, mode, qty: Number(f.quantity) },
    });
    setBusy(false);
    setMessage(
      ok
        ? "Stock movement saved and linked job updated."
        : "Movement rejected: check location quantity, allocation and order balance.",
    );
  };
  return (
    <div className="inventory-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">STORES & PURCHASING</span>
          <h2>Inventory & stock</h2>
          <p>
            Stock locations, reasoned movements, supplier orders and deliveries.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setCreate("Stock item")}>
            Add stock item
          </button>
        )}
      </div>
      <div className="admin-tabs">
        {[
          "Stock",
          "Low stock",
          "Movements",
          "Purchase orders",
          "Suppliers",
        ].map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}>
            {t}
          </button>
        ))}
      </div>
      {["Stock", "Low stock"].includes(tab) && (
        <>
          <label>
            Find stock
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Available</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter(
                    (r) =>
                      (r.title + " " + r.sku)
                        .toLowerCase()
                        .includes(query.toLowerCase()) &&
                      (tab !== "Low stock" ||
                        Number(r.quantity) <= Number(r.reorder || 0)),
                  )
                  .map((r) => (
                    <tr key={r.id}>
                      <th>
                        {r.title}
                        <small className="cell-subtitle">{r.sku}</small>
                      </th>
                      <td>
                        {r.quantity}{" "}
                        {Number(r.quantity) <= Number(r.reorder || 0) && (
                          <Status>Low stock</Status>
                        )}
                      </td>
                      <td>{r.location || "Main store"}</td>
                      <td>
                        <button
                          onClick={() => {
                            setSelected(r.id);
                            setMessage("");
                          }}
                        >
                          Stock movement
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "Movements" &&
        items.flatMap((r) =>
          (r.movements || []).map((m, i) => (
            <article className="stock-movement-entry" key={r.id + i}>
              <strong>
                {r.title} · {m.mode} {m.qty}
              </strong>
              <p>
                {m.at} · {m.reason || "Legacy movement"} ·{" "}
                {m.fromLocation || r.location}
              </p>
              {m.orderId && jobs.find((j) => j.id === m.orderId) && (
                <button
                  onClick={() => {
                    const j = jobs.find((j) => j.id === m.orderId);
                    onNavigate(j.module, { recordId: j.id });
                  }}
                >
                  Open maintenance allocation
                </button>
              )}
            </article>
          )),
        )}
      {tab === "Suppliers" && (
        <>
          {canCreate && (
            <button onClick={() => setCreate("Supplier")}>Add supplier</button>
          )}
          <div className="purpose-grid">
            {suppliers.map((s) => (
              <article className="purpose-card" key={s.id}>
                <h3>{s.title}</h3>
                <p>
                  {s.contact} · {s.email}
                </p>
                <p>
                  {items.filter((i) => i.supplierId === s.id).length} stock
                  items
                </p>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "Purchase orders" && (
        <>
          {canCreate && (
            <button
              disabled={!items.length || !suppliers.length}
              onClick={() => setCreate("Purchase order")}
            >
              Create purchase order
            </button>
          )}
          {!suppliers.length && <p>Add a supplier before creating an order.</p>}
          {orders.map((po) => (
            <article className="purchase-order-card panel" key={po.id}>
              <h3>{po.title}</h3>
              <p>
                {suppliers.find((s) => s.id === po.supplierId)?.title} ·{" "}
                {items.find((i) => i.id === po.stockId)?.title}
              </p>
              <p>
                {po.delivered || 0} of {po.ordered} delivered · Expected{" "}
                {po.dueDate || "Not set"}
              </p>
              <Status>{po.status}</Status>
              {canEdit && Number(po.delivered || 0) < Number(po.ordered) && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (busy) return;
                    setBusy(true);
                    const qty = Number(
                      new FormData(e.currentTarget).get("qty"),
                    );
                    const ok = await onUpdate(org.id, po.stockId, {
                      _stockMovement: {
                        mode: "Receive",
                        qty,
                        reason: "Purchase order delivery",
                        purchaseOrderId: po.id,
                      },
                    });
                    setBusy(false);
                    setMessage(
                      ok
                        ? "Delivery received into stock."
                        : "Delivery exceeds the remaining order or is invalid.",
                    );
                  }}
                >
                  <label>
                    Delivery quantity
                    <input
                      name="qty"
                      type="number"
                      min="1"
                      max={Number(po.ordered) - Number(po.delivered || 0)}
                      step="1"
                      required
                    />
                  </label>
                  <button disabled={busy}>Record delivery</button>
                </form>
              )}
            </article>
          ))}
        </>
      )}
      {message && !item && <p role="status">{message}</p>}
      {create && (
        <Modal
          title={"New " + create.toLowerCase()}
          onClose={() => setCreate("")}
        >
          <form onSubmit={saveNew}>
            <label>
              {create === "Stock item"
                ? "Item name"
                : create === "Supplier"
                  ? "Supplier name"
                  : "Order reference"}
              <input name="title" required pattern=".*\S.*" />
            </label>
            {create === "Stock item" ? (
              <>
                <label>
                  SKU
                  <input name="sku" required />
                </label>
                <label>
                  Description
                  <textarea name="detail" />
                </label>
                <label>
                  Category
                  <input name="category" />
                </label>
                <label>
                  Opening quantity
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    step="1"
                    required
                  />
                </label>
                <label>
                  Minimum quantity
                  <input
                    name="reorder"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue="0"
                  />
                </label>
                <label>
                  Unit cost (£)
                  <input
                    name="unitCost"
                    type="number"
                    min="0"
                    step=".01"
                    defaultValue="0"
                  />
                </label>
                <label>
                  Storage location
                  <input name="location" required />
                </label>
                <label>
                  Supplier
                  <select name="supplierId">
                    <option value="">Unassigned</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : create === "Supplier" ? (
              <>
                <label>
                  Contact
                  <input name="contact" />
                </label>
                <label>
                  Email
                  <input name="email" type="email" />
                </label>
              </>
            ) : (
              <>
                <label>
                  Supplier
                  <select aria-label="Supplier" name="supplierId" required>
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Stock item
                  <select name="stockId" required>
                    {items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Order quantity
                  <input
                    name="ordered"
                    type="number"
                    min="1"
                    step="1"
                    required
                  />
                </label>
                <label>
                  Expected delivery
                  <input name="dueDate" type="date" required />
                </label>
              </>
            )}
            <button disabled={busy}>Save {create.toLowerCase()}</button>
          </form>
        </Modal>
      )}
      {item && (
        <Modal title="Stock management" onClose={() => setSelected(null)}>
          <h2>{item.title}</h2>
          <p>
            {item.sku} · {item.detail} · {item.category || "Uncategorised"}
          </p>
          <p>
            Available: <strong>{item.quantity} units</strong> · Reorder at{" "}
            {item.reorder || 0}
          </p>
          <p>
            Supplier:{" "}
            {suppliers.find((s) => s.id === item.supplierId)?.title ||
              "Not assigned"}{" "}
            · Unit cost £{Number(item.unitCost || 0).toFixed(2)}
          </p>
          <h3>Location balances</h3>
          {Object.entries(
            item.locationBalances || {
              [item.location || "Main store"]: Number(item.quantity),
            },
          ).map(([l, q]) => (
            <p key={l}>
              {l}: {q}
            </p>
          ))}
          {canEdit && (
            <form onSubmit={movement}>
              <label>
                Stock operation
                <select
                  name="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  {[
                    "Receive",
                    "Issue",
                    "Allocate",
                    "Return",
                    "Transfer",
                    "Adjust",
                  ].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              {["Allocate", "Issue", "Return"].includes(mode) && (
                <label>
                  Allocate to work order
                  <select name="orderId" required={mode === "Allocate"}>
                    <option value="">No job</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                From / receipt location
                <select name="fromLocation">
                  {Object.keys(
                    item.locationBalances || {
                      [item.location || "Main store"]: item.quantity,
                    },
                  ).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              {mode === "Transfer" && (
                <label>
                  Destination location
                  <input name="location" required />
                </label>
              )}
              {mode === "Adjust" && (
                <label>
                  Adjustment direction
                  <select name="direction">
                    <option>Increase</option>
                    <option>Decrease</option>
                  </select>
                </label>
              )}
              <label>
                Quantity
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                />
              </label>
              <label>
                Reason
                <input
                  name="reason"
                  required
                  defaultValue="Routine stores movement"
                  pattern=".*\S.*"
                />
              </label>
              <button disabled={busy}>Record stock movement</button>
            </form>
          )}
          {message && <p role="status">{message}</p>}
          <h3>Movement history</h3>
          {(item.movements || []).map((m, i) => (
            <article className="task-note" key={m.id || i}>
              {m.mode} {m.qty} · {m.reason} · {m.at}
              {m.orderId && jobs.find((j) => j.id === m.orderId) && (
                <button
                  onClick={() => {
                    const j = jobs.find((j) => j.id === m.orderId);
                    onNavigate(j.module, { recordId: j.id });
                  }}
                >
                  Open receiving job
                </button>
              )}
            </article>
          ))}
        </Modal>
      )}
      <p className="module-disclaimer">
        Fictional session-only stock. Refresh resets quantities, orders and
        movements.
      </p>
    </div>
  );
}
