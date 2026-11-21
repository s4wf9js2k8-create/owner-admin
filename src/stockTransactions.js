import { moduleInfo } from "./customerModules.js";
import { activityEntry } from "./administrationRules.js";
export function moveStock(records, orgId, id, request, actor) {
  const item = records.find(
    (r) =>
      r.orgId === orgId &&
      r.id === id &&
      moduleInfo(r.module).type === "inventory" &&
      !r.recordType,
  );
  if (!item) throw Error("Select an existing stock item.");
  const { mode, reason, orderId, location, purchaseOrderId } = request,
    qty = Number(request.qty),
    at = new Date().toISOString();
  if (
    !["Receive", "Issue", "Allocate", "Return", "Transfer", "Adjust"].includes(
      mode,
    ) ||
    !Number.isSafeInteger(qty) ||
    qty <= 0 ||
    !String(reason || "").trim()
  )
    throw Error("Enter a positive whole quantity and movement reason.");
  const job =
    orderId &&
    records.find(
      (r) =>
        r.id === orderId &&
        r.orgId === orgId &&
        moduleInfo(r.module).type === "maintenance",
    );
  if ((orderId && !job) || (mode === "Allocate" && !job))
    throw Error("Select an existing maintenance job.");
  if (job?.archivedAt)
    throw Error("Restore the job before changing its stock allocation.");
  const available = Number(item.quantity || 0);
  let next = available;
  const balances = {
      ...(item.locationBalances || {
        [item.location || "Main store"]: available,
      }),
    },
    source = request.fromLocation || item.location || "Main store";
  if (mode === "Transfer") {
    if (
      !location?.trim() ||
      location === source ||
      qty > Number(balances[source] || 0)
    )
      throw Error("Choose a different location with sufficient stock.");
    balances[source] -= qty;
    balances[location] = Number(balances[location] || 0) + qty;
  } else {
    if (mode === "Return" && job) {
      const allocated = (job.partsUsed || [])
        .filter((p) => p.stockId === id)
        .reduce((n, p) => n + Number(p.qty || 0), 0);
      if (qty > allocated)
        throw Error("Return exceeds parts allocated to this job.");
    }
    const delta = ["Receive", "Return"].includes(mode)
      ? qty
      : mode === "Adjust"
        ? request.direction === "Decrease"
          ? -qty
          : qty
        : -qty;
    next += delta;
    if (
      !Number.isSafeInteger(next) ||
      next < 0 ||
      Number(balances[source] || 0) + delta < 0
    )
      throw Error("Insufficient stock at the selected location.");
    balances[source] = Number(balances[source] || 0) + delta;
  }
  const po =
    purchaseOrderId &&
    records.find(
      (r) =>
        r.id === purchaseOrderId &&
        r.orgId === orgId &&
        r.recordType === "purchase-order" &&
        r.stockId === id,
    );
  if (
    purchaseOrderId &&
    (!po ||
      mode !== "Receive" ||
      qty > Number(po.ordered) - Number(po.delivered || 0))
  )
    throw Error("Delivery exceeds outstanding purchase order.");
  const movement = {
    id: crypto.randomUUID(),
    mode,
    qty,
    reason: reason.trim(),
    orderId: job?.id || "",
    fromLocation: source,
    location: location || source,
    at,
    purchaseOrderId: po?.id || "",
  };
  return records.map((r) => {
    if (r.orgId !== orgId) return r;
    if (r.id === id)
      return {
        ...r,
        quantity: String(next),
        locationBalances: balances,
        movements: [...(r.movements || []), movement],
        activity: [
          ...(r.activity || []),
          activityEntry(actor, "Stock " + mode, `${qty} units · ${reason}`),
        ].slice(-100),
      };
    if (job && r.id === job.id) {
      let parts = [...(r.partsUsed || [])];
      if (mode === "Return") {
        let remaining = qty;
        parts = parts
          .map((p) => {
            if (p.stockId !== id) return p;
            const take = Math.min(remaining, Number(p.qty));
            remaining -= take;
            return { ...p, qty: Number(p.qty) - take };
          })
          .filter((p) => Number(p.qty) > 0);
      } else if (["Allocate", "Issue"].includes(mode))
        parts.push({
          stockId: id,
          name: item.title,
          sku: item.sku,
          qty,
          movementId: movement.id,
        });
      return {
        ...r,
        partsUsed: parts,
        history: [
          ...(r.history || []),
          { at, text: `Parts ${mode}: ${item.title} · ${qty}` },
        ],
        activity: [
          ...(r.activity || []),
          activityEntry(actor, "Parts " + mode, `${item.title}: ${qty}`),
        ].slice(-100),
      };
    }
    if (po && r.id === po.id) {
      const delivered = Number(po.delivered || 0) + qty;
      return {
        ...r,
        delivered,
        status: delivered === Number(po.ordered) ? "Complete" : "In progress",
      };
    }
    return r;
  });
}
