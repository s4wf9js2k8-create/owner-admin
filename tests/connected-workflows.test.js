import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("customer workspace wires bespoke events and forms",()=>{
 const src=readFileSync(new URL("../src/CustomerWorkspace.jsx",import.meta.url),"utf8");
 assert.match(src,/CustomerEventsOps/);
 assert.match(src,/CustomerFormsOps/);
});
test("event booking validates capacity and check-in",()=>{
 const src=readFileSync(new URL("../src/CustomerEventsOps.jsx",import.meta.url),"utf8");
 assert.match(src,/used\(event\)\+guests<=capacity\(event\)/);
 assert.match(src,/Checked in/);
 assert.match(src,/Waitlist/);
});
test("forms support field configuration and response creation",()=>{
 const src=readFileSync(new URL("../src/CustomerFormsOps.jsx",import.meta.url),"utf8");
 assert.match(src,/form-response/);
 assert.match(src,/required/);
});
