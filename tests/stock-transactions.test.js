import test from "node:test";
import assert from "node:assert/strict";
import { createFictionalBackend } from "../src/backend/fictional.js";
import { moduleInfo } from "../src/customerModules.js";
const orgId = "demo-engineering";
test("allocation and returns update the job atomically; transfers preserve total stock", async () => {
  const b = createFictionalBackend(),
    job = b
      .getSnapshot()
      .records.find(
        (r) => r.orgId === orgId && moduleInfo(r.module).type === "maintenance",
      );
  const stock = await b.records.create(orgId, {
    module: "Inventory and stock",
    title: "Test bearing",
    quantity: "10",
    location: "Main store",
  });
  const move = (r) =>
    b.records.update(orgId, stock.id, {
      _stockMovement: { reason: "Test stores movement", ...r },
    });
  await move({ mode: "Allocate", qty: 4, orderId: job.id });
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === stock.id).quantity,
    "6",
  );
  assert.equal(
    b
      .getSnapshot()
      .records.find((r) => r.id === job.id)
      .partsUsed.at(-1).qty,
    4,
  );
  const before = JSON.stringify(b.getSnapshot());
  await assert.rejects(() => move({ mode: "Return", qty: 5, orderId: job.id }));
  assert.equal(JSON.stringify(b.getSnapshot()), before);
  await move({ mode: "Return", qty: 2, orderId: job.id });
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === stock.id).quantity,
    "8",
  );
  assert.equal(
    b
      .getSnapshot()
      .records.find((r) => r.id === job.id)
      .partsUsed.at(-1).qty,
    2,
  );
  await move({ mode: "Transfer", qty: 3, location: "Workshop" });
  assert.deepEqual(
    b.getSnapshot().records.find((r) => r.id === stock.id).locationBalances,
    { "Main store": 5, Workshop: 3 },
  );
  await assert.rejects(() => move({ mode: "Issue", qty: 6 }));
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === stock.id).quantity,
    "8",
  );
});
test("partial purchase deliveries update stock and order together and reject excess delivery", async () => {
  const b = createFictionalBackend(),
    stock = await b.records.create(orgId, {
      module: "Inventory and stock",
      title: "Test filter",
      quantity: "0",
    }),
    po = await b.records.create(orgId, {
      module: "Inventory and stock",
      title: "PO test",
      recordType: "purchase-order",
      stockId: stock.id,
      ordered: 5,
      delivered: 0,
    });
  const receive = (qty) =>
    b.records.update(orgId, stock.id, {
      _stockMovement: {
        mode: "Receive",
        qty,
        reason: "Delivery",
        purchaseOrderId: po.id,
      },
    });
  await receive(3);
  await assert.rejects(() => receive(3));
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === stock.id).quantity,
    "3",
  );
  await receive(2);
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === po.id).status,
    "Complete",
  );
});
