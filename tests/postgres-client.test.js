import { test } from "node:test";
import assert from "node:assert/strict";
import { createPostgresClient } from "../src/backend/postgres.js";
test("Postgres client uses explicit same-origin API, session cookies, CSRF header and expected versions", async () => {
  const calls = [];
  const client = createPostgresClient({
    fetcher: async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => ({ saved: true }) };
    },
  });
  await client.records.update("company", "record", { title: "Synthetic" }, 2);
  const [url, options] = calls[0];
  assert.equal(url, "/api/companies/company/records/record");
  assert.equal(options.credentials, "same-origin");
  assert.equal(options.headers["X-CSRF-Protection"], "1");
  assert.deepEqual(JSON.parse(options.body), {
    title: "Synthetic",
    version: 2,
  });
});
test("Postgres transport errors remain explicit and never fall back to demo data", async () => {
  const unavailable = createPostgresClient({
    fetcher: async () => {
      throw Error("network");
    },
  });
  await assert.rejects(unavailable.auth.getSession(), /Server unavailable/);
  const forbidden = createPostgresClient({
    fetcher: async () => ({
      ok: false,
      json: async () => ({ error: "FORBIDDEN" }),
    }),
  });
  await assert.rejects(forbidden.records.list("c", "tasks"), /FORBIDDEN/);
});
