import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { fileConcurrencyGate } from "../src/limits.js";
test("buffered file concurrency is bounded and close/finish release exactly one slot", () => {
  const gate = fileConcurrencyGate(2);
  let next = 0;
  const response = () =>
    Object.assign(new EventEmitter(), {
      status(code) {
        this.code = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    });
  const a = response(),
    b = response(),
    c = response();
  gate({}, a, () => next++);
  gate({}, b, () => next++);
  gate({}, c, () => next++);
  assert.equal(next, 2);
  assert.equal(c.code, 429);
  assert.deepEqual(c.body, { error: "RATE_LIMITED" });
  a.emit("close");
  a.emit("finish");
  gate({}, response(), () => next++);
  assert.equal(next, 3);
  const stillFull = response();
  gate({}, stillFull, () => next++);
  assert.equal(stillFull.code, 429);
  b.emit("finish");
  gate({}, response(), () => next++);
  assert.equal(next, 4);
});

test("client abort does not release the budget while its handler retains a buffer", () => {
  const gate = fileConcurrencyGate(1);
  const req = {};
  let next = 0;
  const response = () =>
    Object.assign(new EventEmitter(), {
      status(code) {
        this.code = code;
        return this;
      },
      json() {
        return this;
      },
    });
  const active = response();
  gate(req, active, () => next++);
  assert(req.fileLease.start());
  active.emit("close");
  const denied = response();
  gate({}, denied, () => next++);
  assert.equal(denied.code, 429);
  assert.equal(next, 1);
  req.fileLease.done();
  const newRequest = {};
  const admitted = response();
  gate(newRequest, admitted, () => next++);
  assert.equal(next, 2);
  admitted.emit("close");
  assert.equal(newRequest.fileLease.start(), false);
});
