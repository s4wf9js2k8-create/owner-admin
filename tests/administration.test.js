import test from "node:test";
import assert from "node:assert/strict";
import { createFictionalBackend } from "../src/backend/fictional.js";
import {
  approvalType,
  approvalToken,
  recordInScope,
} from "../src/administrationRules.js";
import { availabilityAssessment } from "../src/staffEligibility.js";
const orgId = "demo-engineering";
const setup = async () => {
  const backend = createFictionalBackend();
  const records = await backend.records.list(orgId);
  return {
    backend,
    records,
    a: records.find(
      (r) =>
        r.module === "Staff & volunteers" && r.title === "Sample coordinator A",
    ),
    b: records.find(
      (r) =>
        r.module === "Staff & volunteers" && r.title === "Sample colleague B",
    ),
  };
};
test("central leave decision rejects self-approval and stale decisions, and updates assignment eligibility", async () => {
  const { backend, a, b } = await setup();
  const leave = await backend.records.create(orgId, {
    module: "Leave and availability",
    title: "Test leave",
    personId: a.id,
    approval: "Pending",
    startDate: "2027-02-01",
    endDate: "2027-02-02",
    _actor: { actorId: a.id, actorName: a.title },
  });
  await assert.rejects(() =>
    backend.records.update(orgId, leave.id, {
      _approval: {
        actorId: a.id,
        token: approvalToken(leave),
        decision: "Approve",
        comment: "Self",
      },
    }),
  );
  const decision = {
    actorId: b.id,
    token: approvalToken(leave),
    decision: "Approve",
    comment: "Coverage checked",
  };
  await backend.records.update(orgId, leave.id, {
    _approval: decision,
    _actor: { actorId: b.id, actorName: b.title },
  });
  await assert.rejects(() =>
    backend.records.update(orgId, leave.id, {
      _approval: { ...decision, decision: "Reject" },
    }),
  );
  const updated = await backend.records.list(orgId);
  assert.equal(updated.find((r) => r.id === leave.id).approval, "Approved");
  assert.equal(
    availabilityAssessment(a, updated, orgId, {
      kind: "maintenance",
      date: "2027-02-01",
    }).eligible,
    false,
  );
  await backend.records.update(orgId, leave.id, { approval: "Cancelled" });
  assert.equal(
    availabilityAssessment(a, await backend.records.list(orgId), orgId, {
      kind: "maintenance",
      date: "2027-02-01",
    }).eligible,
    true,
  );
});
test("timesheet correction retains original hours until another user approves", async () => {
  const { backend, a, records } = await setup();
  const row = records.find(
    (r) => r.module === "Attendance & timesheets" && r.endTime,
  );
  await backend.records.update(orgId, row.id, {
    correctionRequest: {
      status: "Pending",
      at: "2026-11-13T12:00:00Z",
      requesterId: a.id,
      startTime: "2026-11-06T09:00",
      endTime: "2026-11-06T17:00",
      breakMinutes: 30,
      reason: "Missed session",
    },
  });
  const pending = (await backend.records.list(orgId)).find(
    (r) => r.id === row.id,
  );
  assert.equal(pending.startTime, row.startTime);
  await backend.records.update(orgId, row.id, {
    _approval: {
      actorId: records.find((r) => r.module === "Staff").id,
      token: approvalToken(pending),
      decision: "Approve",
      comment: "Checked",
    },
  });
  const approved = (await backend.records.list(orgId)).find(
    (r) => r.id === row.id,
  );
  assert.equal(approved.startTime, "2026-11-06T09:00");
  assert.equal(approved.breakMinutes, 30);
  assert.equal(approved.correctionRequest.status, "Approved");
});
test("failed-inspection automation is atomic, non-recursive and deduplicated", async () => {
  const { backend, b } = await setup();
  await backend.organisations.update(orgId, {
    workspaceConfig: {
      automationRules: [
        {
          id: "rule",
          name: "Defect follow-up",
          trigger: "Inspection failed",
          action: "Create corrective maintenance",
          enabled: true,
        },
      ],
    },
  });
  const inspection = await backend.records.create(orgId, {
    module: "Inspections",
    title: "Failed guard",
    result: "Fail",
    inspectorId: b.id,
    dueDate: "2027-03-01",
  });
  for (let i = 0; i < 3; i++)
    await backend.records.update(orgId, inspection.id, {
      findings: "Guard failed",
    });
  const snapshot = backend.getSnapshot();
  assert.equal(
    snapshot.records.filter((r) => r.sourceInspectionId === inspection.id)
      .length,
    1,
  );
  assert.equal(
    snapshot.orgs
      .find((o) => o.id === orgId)
      .workspaceConfig.automationRuns.filter((r) => r.status === "Success")
      .length,
    1,
  );
});
test("activity retains actor and changed fields, and resetting clears changes", async () => {
  const { backend, a } = await setup();
  const row = await backend.records.create(orgId, {
    module: "Tasks & projects",
    title: "Audited task",
    ownerId: a.id,
    owner: a.title,
    _actor: { actorId: a.id, actorName: a.title },
  });
  await backend.records.update(orgId, row.id, {
    status: "Complete",
    _actor: { actorId: a.id, actorName: a.title },
  });
  const updated = (await backend.records.list(orgId)).find(
    (r) => r.id === row.id,
  );
  assert.equal(updated.activity.length, 2);
  assert.equal(updated.activity[1].actorId, a.id);
  assert.equal(updated.activity[1].action, "Status changed");
  await backend.reset();
  assert.equal(
    (await backend.records.list(orgId)).some((r) => r.id === row.id),
    false,
  );
});
test("ownership, sensitive and location scopes deny incomplete or unrelated records", () => {
  const person = { id: "a", title: "Alex", orgId: "o" };
  assert.equal(
    recordInScope(
      { module: "Tasks", ownerId: "b" },
      { ownership: "Mine" },
      person,
    ),
    false,
  );
  assert.equal(
    recordInScope(
      { module: "Tasks", ownerId: "a" },
      { ownership: "Mine" },
      person,
    ),
    true,
  );
  assert.equal(
    recordInScope(
      { module: "Tasks", ownerId: "a", sensitive: true },
      { ownership: "Mine" },
      person,
    ),
    false,
  );
  assert.equal(
    recordInScope({ module: "Tasks" }, { location: "Workshop" }, person),
    false,
  );
});
test("assignment validation reads leave even if its module is hidden from the assigning role", async () => {
  const { backend, a } = await setup();
  await backend.records.create(orgId, {
    module: "Leave and availability",
    title: "Approved absence",
    personId: a.id,
    approval: "Approved",
    startDate: "2027-03-01",
    endDate: "2027-03-01",
  });
  await assert.rejects(() =>
    backend.records.create(orgId, {
      module: "Maintenance & work orders",
      title: "Unavailable engineer",
      engineerId: a.id,
      owner: a.title,
      dueDate: "2027-03-01",
    }),
  );
});

test("recurring-task automation reuses an already generated occurrence", async () => {
  const { backend, a } = await setup();
  const source = await backend.records.create(orgId, {
    module: "Tasks & projects",
    recordType: "task",
    title: "Recurring source",
    ownerId: a.id,
    owner: a.title,
    dueDate: "2027-04-01",
    recurrence: "Weekly",
    status: "Planned",
  });
  await backend.records.create(orgId, {
    module: "Tasks & projects",
    recordType: "task",
    title: "Existing next occurrence",
    originId: source.id,
    dueDate: "2027-04-08",
    status: "Planned",
  });
  await backend.organisations.update(orgId, {
    workspaceConfig: {
      automationRules: [
        {
          id: "repeat",
          name: "Repeat weekly task",
          trigger: "Task completed",
          action: "Create next recurring task",
          enabled: true,
        },
      ],
    },
  });
  await backend.records.update(orgId, source.id, { status: "Complete" });
  const rows = await backend.records.list(orgId);
  assert.equal(
    rows.filter(
      (r) => r.originId === source.id || r.automationSourceId === source.id,
    ).length,
    1,
  );
});

test("task changes-requested leaves the pending queue until explicitly resubmitted", async () => {
  const { backend, a, b } = await setup();
  const task = await backend.records.create(orgId, {
    module: "Tasks & projects",
    title: "Reviewable task",
    ownerId: a.id,
    owner: a.title,
    approval: "Pending",
    dueDate: "2027-06-01",
  });
  await backend.records.update(orgId, task.id, {
    _approval: {
      actorId: b.id,
      token: approvalToken(task),
      decision: "Request changes",
      comment: "Add completion evidence",
    },
  });
  const changed = (await backend.records.list(orgId)).find(
    (r) => r.id === task.id,
  );
  assert.equal(approvalType(changed), "");
  await assert.rejects(() =>
    backend.records.update(orgId, task.id, {
      _approval: {
        actorId: b.id,
        token: approvalToken(changed),
        decision: "Approve",
        comment: "Premature decision",
      },
    }),
  );
  await backend.records.update(orgId, task.id, {
    approval: "Pending",
    approvalNeedsChanges: false,
  });
  const resubmitted = (await backend.records.list(orgId)).find(
    (r) => r.id === task.id,
  );
  await backend.records.update(orgId, task.id, {
    _approval: {
      actorId: b.id,
      token: approvalToken(resubmitted),
      decision: "Approve",
      comment: "Evidence checked",
    },
  });
  assert.equal(
    (await backend.records.list(orgId)).find((r) => r.id === task.id).approval,
    "Approved",
  );
});
