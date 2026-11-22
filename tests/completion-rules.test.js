import test from "node:test";
import assert from "node:assert/strict";
import { createFictionalBackend } from "../src/backend/fictional.js";
import {
  validateAnswers,
  validateFields,
  businessCommand,
} from "../src/completion/rules.js";
const org = {
  id: "o",
  modules: [
    "Forms and surveys",
    "Staff & volunteers",
    "Training and qualifications",
    "Vehicle / fleet management",
    "Maintenance & work orders",
    "Assets & equipment",
    "Tasks & projects",
    "Health & safety",
  ],
};
const person = {
  id: "p",
  orgId: "o",
  module: "Staff & volunteers",
  title: "Fictional driver",
  employmentStatus: "Active",
};
const qualification = {
  id: "q",
  orgId: "o",
  module: "Training and qualifications",
  personId: "p",
  qualification: "Vehicle driving",
  approval: "Approved",
  noExpiry: true,
  validFrom: "2020-01-01",
};
const vehicle = {
  id: "v",
  orgId: "o",
  module: "Vehicle / fleet management",
  title: "Van",
  mileage: 100,
  assetRefId: "a",
};
const asset = {
  id: "a",
  orgId: "o",
  module: "Assets & equipment",
  title: "Van asset",
};
const fields = [
  { id: "q", label: "Safe", type: "Yes / No", required: true },
  {
    id: "n",
    label: "Defect",
    type: "Long text",
    required: true,
    conditionFieldId: "q",
    conditionValue: "No",
  },
];
const template = {
  id: "f",
  orgId: "o",
  module: "Forms and surveys",
  recordType: "form-template",
  title: "Defect",
  status: "Published",
  fields,
  version: 2,
  workflow: "Defect to maintenance",
};
const base = [person, qualification, vehicle, asset, template];
const api = (rows = base) =>
  createFictionalBackend({
    fixtures: () => ({
      orgs: [org],
      records: rows,
      plans: [],
      tickets: [],
      flags: {},
      logs: [],
    }),
  });
test("conditional form validation rejects incomplete responses and removes hidden answers", () => {
  assert.deepEqual(validateAnswers(fields, { q: "Yes", n: "hidden" }), {
    q: "Yes",
  });
  assert.throws(() => validateAnswers(fields, { q: "No" }), /Defect/);
  assert.throws(
    () =>
      validateFields([
        ...fields,
        { id: "n", label: "duplicate", type: "Number" },
      ]),
    /unique/,
  );
});
test("published form submission atomically links versioned response and corrective maintenance", async () => {
  const b = api();
  await assert.rejects(
    b.records.update("o", "f", {
      _workflow: {
        kind: "formSubmit",
        answers: { q: "No", n: "Broken light" },
      },
    }),
    /linked to an existing asset/,
  );
  assert.equal(b.getSnapshot().records.length, base.length);
  await b.records.update("o", "f", {
    _workflow: {
      kind: "formSubmit",
      answers: { q: "No", n: "Broken light" },
      relatedRecordId: "a",
    },
  });
  const rows = b.getSnapshot().records,
    r = rows.find((r) => r.recordType === "form-response");
  assert.equal(r.templateVersion, 2);
  assert.equal(r.relatedRecordId, "a");
  assert.equal(rows.find((j) => j.id === r.workOrderId).assetRefId, "a");
});
test("unpublished forms cannot accept responses", () => {
  assert.throws(
    () =>
      businessCommand(
        base.map((r) => (r.id === "f" ? { ...r, status: "Draft" } : r)),
        org,
        "f",
        { kind: "formSubmit", answers: { q: "Yes" } },
      ),
    /Publish/,
  );
});
test("vehicle defects require qualified driver and complete checklist, update mileage once, link maintenance", async () => {
  const b = api();
  const command = {
    kind: "vehicleCheck",
    requestId: "check",
    driverId: "p",
    mileage: 110,
    date: "2026-12-10",
    answers: Object.fromEntries(
      [
        "Tyres",
        "Lights",
        "Brakes",
        "Fluid levels",
        "Bodywork",
        "Safety equipment",
      ].map((q) => [q, q === "Lights" ? "Fail" : "Pass"]),
    ),
    findings: "Broken light",
    createWork: true,
  };
  await b.records.update("o", "v", { _workflow: command });
  await b.records.update("o", "v", { _workflow: command });
  const rows = b.getSnapshot().records,
    v = rows.find((r) => r.id === "v");
  assert.equal(v.mileage, 110);
  assert.equal(v.checks.length, 1);
  assert.equal(rows.filter((j) => j.sourceFleetId === "v").length, 1);
  assert.equal(rows.find((j) => j.sourceFleetId === "v").assetRefId, "a");
  await assert.rejects(
    b.records.update("o", "v", {
      _workflow: { ...command, requestId: "next", mileage: 90 },
    }),
    /Mileage/,
  );
  const expired = api(
    base.map((r) =>
      r.id === "q" ? { ...r, noExpiry: false, expiry: "2020-01-02" } : r,
    ),
  );
  await assert.rejects(
    expired.records.update("o", "v", { _workflow: command }),
    /expired/i,
  );
});
test("archive preserves original record and links, prevents active record archival and restores status", async () => {
  const b = api([
    ...base,
    {
      id: "j",
      orgId: "o",
      module: "Maintenance & work orders",
      title: "Repair",
      status: "Complete",
      assetRefId: "a",
      history: [{ text: "done" }],
    },
  ]);
  await assert.rejects(
    b.records.update("o", "v", {
      _workflow: { kind: "archive", reason: "old" },
    }),
    /Only completed/,
  );
  await b.records.update("o", "j", {
    _workflow: { kind: "archive", reason: "Finished" },
  });
  let j = b.getSnapshot().records.find((r) => r.id === "j");
  assert.ok(j.archivedAt);
  assert.equal(j.assetRefId, "a");
  await b.records.update("o", "j", { _workflow: { kind: "restore" } });
  j = b.getSnapshot().records.find((r) => r.id === "j");
  assert.equal(j.archivedAt, undefined);
  assert.equal(j.status, "Complete");
  assert.equal(j.history[0].text, "done");
  assert.equal(j.archiveHistory.length, 2);
});
test("training assessment creates pending qualifications once and retains approved certificates", async () => {
  const session = {
    id: "s",
    orgId: "o",
    module: "Training and qualifications",
    recordType: "training-session",
    title: "Driving course",
    qualification: "Vehicle driving",
    attendeeIds: ["p"],
    startTime: "2026-12-10T10:00",
    status: "Planned",
  };
  const b = api([...base, session]);
  await assert.rejects(
    b.records.update("o", "s", {
      _workflow: { kind: "assessTraining", results: { p: "Pass" } },
    }),
    /expiry/,
  );
  await b.records.update("o", "s", {
    _workflow: {
      kind: "assessTraining",
      results: { p: "Pass" },
      expiry: "2028-12-10",
    },
  });
  await b.records.update("o", "s", {
    _workflow: {
      kind: "assessTraining",
      results: { p: "Pass" },
      expiry: "2028-12-10",
    },
  });
  assert.equal(
    b.getSnapshot().records.filter((r) => r.sourceSessionId === "s").length,
    1,
  );
  assert.equal(
    b.getSnapshot().records.find((r) => r.sourceSessionId === "s").approval,
    "Pending",
  );
  assert.equal(
    b.getSnapshot().records.find((r) => r.id === "q").approval,
    "Approved",
  );
});

test("schedule generation validates the entire batch before publication and skips repeat occurrences", async () => {
  const org2 = { ...org, modules: [...org.modules, "Shift rotas"] },
    template = {
      id: "pattern",
      orgId: "o",
      module: "Shift rotas",
      recordType: "schedule-template",
      title: "Weekly duty",
      snapshot: {
        personId: "p",
        start: "09:00",
        end: "13:00",
        location: "Workshop",
      },
    };
  const b = createFictionalBackend({
    fixtures: () => ({
      orgs: [org2],
      records: [...base, template],
      plans: [],
      tickets: [],
      flags: {},
      logs: [],
    }),
  });
  const command = {
    kind: "generateSchedule",
    from: "2027-03-01",
    to: "2027-03-15",
    interval: 7,
  };
  await b.records.update("o", "pattern", { _workflow: command });
  await b.records.update("o", "pattern", { _workflow: command });
  assert.equal(
    b.getSnapshot().records.filter((r) => r.createdFromTemplateId === "pattern")
      .length,
    3,
  );
  await b.records.create("o", {
    module: "Shift rotas",
    title: "Other duty",
    personId: "p",
    person: person.title,
    startTime: "2027-02-25T09:30",
    endTime: "2027-02-25T10:00",
    status: "Planned",
  });
  const before = b.getSnapshot().records.length;
  await assert.rejects(
    b.records.update("o", "pattern", {
      _workflow: {
        ...command,
        from: "2027-02-22",
        to: "2027-03-01",
        interval: 1,
      },
    }),
    /already|conflict|assigned|overlap/i,
  );
  assert.equal(b.getSnapshot().records.length, before);
});
test("new work orders cannot close without checklist completion and a supervisor decision", async () => {
  const b = api([
    ...base,
    {
      id: "engineer",
      orgId: "o",
      module: "Training and qualifications",
      personId: "p",
      person: "Fictional driver",
      qualification: "Maintenance engineering",
      approval: "Approved",
      noExpiry: true,
    },
  ]);
  const r = await b.records.create("o", {
    module: "Maintenance & work orders",
    title: "Review gate",
    engineerId: "p",
    dueDate: "2027-05-01",
    checklist: [{ text: "Verify repair", done: false }],
    status: "Planned",
  });
  await assert.rejects(
    b.records.update("o", r.id, { status: "Complete" }),
    /checklist/,
  );
  await b.records.update("o", r.id, {
    checklist: [{ text: "Verify repair", done: true }],
  });
  await assert.rejects(
    b.records.update("o", r.id, { status: "Complete" }),
    /supervisor approval/,
  );
  await assert.rejects(
    b.records.update("o", r.id, { review: "Approved" }),
    /supervisor approval workflow/,
  );
  assert.equal(
    b.getSnapshot().records.find((x) => x.id === r.id).status,
    "Planned",
  );
});
test("vehicle registration creates one linked equipment record in the same publication", async () => {
  const b = api();
  const r = await b.records.create("o", {
    module: "Vehicle / fleet management",
    recordType: "vehicle",
    title: "Fictional van",
    registration: "DEMO-2",
    mileage: 0,
  });
  assert.equal(
    b.getSnapshot().records.find((a) => a.id === r.assetRefId).sourceFleetId,
    r.id,
  );
});
