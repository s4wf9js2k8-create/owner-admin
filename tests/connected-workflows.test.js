import test from "node:test";
import assert from "node:assert/strict";
import { eventUsage, eventAttendance } from "../src/scheduling/rules.js";
import { validateAnswers } from "../src/completion/rules.js";
import { readFileSync } from "node:fs";
test("customer workspace wires bespoke events and forms", () => {
  const src = readFileSync(
    new URL("../src/CustomerWorkspace.jsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /CustomerEventsOps/);
  assert.match(src, /CustomerFormsOps/);
});
test("event booking counts reservations and check-in separately from the waiting list", () => {
  const rows = [
    {
      recordType: "booking",
      eventId: "event",
      guests: 3,
      bookingStatus: "Confirmed",
    },
    {
      recordType: "booking",
      eventId: "event",
      guests: 2,
      bookingStatus: "Checked in",
    },
    {
      recordType: "booking",
      eventId: "event",
      guests: 9,
      bookingStatus: "Waitlist",
    },
    {
      recordType: "booking",
      eventId: "event",
      guests: 8,
      bookingStatus: "Cancelled",
    },
  ];
  assert.equal(eventUsage(rows, "event"), 5);
  assert.equal(eventAttendance(rows, "event"), 2);
});
test("published form responses validate date, number and choice values", () => {
  const fields = [
    { id: "d", label: "Date", type: "Date", required: true },
    { id: "n", label: "Count", type: "Number", required: true },
    { id: "c", label: "Type", type: "Dropdown", options: ["A", "B"] },
  ];
  assert.throws(
    () => validateAnswers(fields, { d: "2026-02-30", n: "3" }),
    /valid date/,
  );
  assert.throws(
    () => validateAnswers(fields, { d: "2026-02-28", n: "invalid" }),
    /valid number/,
  );
  assert.throws(
    () => validateAnswers(fields, { d: "2026-02-28", n: "3", c: "C" }),
    /listed answer/,
  );
});
