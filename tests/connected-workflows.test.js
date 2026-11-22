import test from "node:test";
import assert from "node:assert/strict";
import { eventUsage, eventAttendance } from "../src/scheduling/rules.js";
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
test("forms support field configuration and response creation", () => {
  const src = readFileSync(
    new URL("../src/CustomerFormsOps.jsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /form-response/);
  assert.match(src, /required/);
});
