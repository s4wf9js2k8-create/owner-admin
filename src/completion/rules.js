import { originalCommand } from "../reconciliation/rules.js";
import { finalCommand, validateFinalRecord } from "./finalRules.js";
import { validateDemoAssignment } from "../demoAssignmentRules.js";
import { moduleInfo } from "../customerModules.js";
import { availabilityAssessment } from "../staffEligibility.js";
import { financialStatus } from "../financialRules.js";
import { activityEntry } from "../administrationRules.js";
export const vehicleQuestions = [
  "Tyres",
  "Lights",
  "Brakes",
  "Fluid levels",
  "Bodywork",
  "Safety equipment",
];
export const formFieldTypes = [
  "Section",
  "Short text",
  "Long text",
  "Number",
  "Date",
  "Dropdown",
  "Multiple choice",
  "Checkboxes",
  "Yes / No",
];
const today = () => new Date().toISOString().slice(0, 10);
const validDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value + "T12:00Z").toISOString().slice(0, 10) === value;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const whole = (value, label, min = 0, max = 1000000) => {
  const n = Number(value);
  assert(
    Number.isSafeInteger(n) && n >= min && n <= max,
    label + ": enter a whole number between " + min + " and " + max + ".",
  );
  return n;
};
const type = (r) => moduleInfo(r.module).type;
export function archiveEligibility(record) {
  if (
    [
      "form-template",
      "inspection-template",
      "resource",
      "supplier",
      "report-config",
      "campaign",
      "product",
      "schedule-template",
      "operations-template",
      "maintenance-template",
      "training-session",
    ].includes(record.recordType)
  )
    return false;
  if (type(record) === "training")
    return (
      record.approval === "Rejected" ||
      Boolean(record.expiry && record.expiry < today())
    );
  if (type(record) === "finance")
    return ["Paid", "Cancelled"].includes(financialStatus(record));
  if (type(record) === "people")
    return ["Left", "Inactive", "Suspended"].includes(record.employmentStatus);
  if (type(record) === "inspections")
    return (
      ["Pass", "Fail", "Requires attention"].includes(record.result) &&
      Boolean(record.submittedAt || record.status === "Complete")
    );
  return (
    [
      "Complete",
      "Completed",
      "Cancelled",
      "Closed",
      "Resolved",
      "Submitted",
      "Reviewed",
    ].includes(record.status) ||
    (record.approval === "Approved" &&
      ["documents", "timesheets", "training"].includes(type(record)))
  );
}
export const fieldVisible = (field, answers) =>
  !field.conditionFieldId ||
  String(answers[field.conditionFieldId] ?? "") ===
    String(field.conditionValue ?? "");
export function validateFields(fields) {
  assert(
    Array.isArray(fields) &&
      fields.length &&
      fields.some((f) => f.type !== "Section"),
    "Add at least one question.",
  );
  const ids = new Set();
  for (const f of fields) {
    assert(
      f.id && !ids.has(f.id) && String(f.label || "").trim(),
      "Every field needs a unique ID and a label.",
    );
    assert(formFieldTypes.includes(f.type), "Unsupported form field type.");
    if (f.conditionFieldId)
      assert(
        ids.has(f.conditionFieldId),
        "Conditional questions must refer to an earlier question.",
      );
    if (["Dropdown", "Multiple choice", "Checkboxes"].includes(f.type))
      assert(
        f.options?.length && f.options.every((v) => String(v).trim()),
        f.label + ": add choices.",
      );
    ids.add(f.id);
  }
}
export function validateAnswers(fields, answers) {
  validateFields(fields);
  const accepted = {};
  for (const f of fields) {
    if (f.type === "Section" || !fieldVisible(f, accepted)) continue;
    const v = answers[f.id];
    const empty =
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && !v.length);
    assert(!f.required || !empty, f.label + ": a response is required.");
    if (empty) {
      accepted[f.id] = "";
      continue;
    }
    if (f.type === "Number")
      assert(Number.isFinite(Number(v)), f.label + ": enter a valid number.");
    if (f.type === "Date")
      assert(
        /^\d{4}-\d{2}-\d{2}$/.test(String(v)) &&
          !Number.isNaN(Date.parse(v)) &&
          new Date(v + "T12:00Z").toISOString().slice(0, 10) === v,
        f.label + ": choose a valid date.",
      );
    if (["Dropdown", "Multiple choice", "Yes / No"].includes(f.type))
      assert(
        (f.type === "Yes / No" ? ["Yes", "No"] : f.options).includes(v),
        f.label + ": choose a listed answer.",
      );
    if (f.type === "Checkboxes")
      assert(
        Array.isArray(v) && v.every((x) => f.options.includes(x)),
        f.label + ": choose listed answers.",
      );
    accepted[f.id] = v;
  }
  return accepted;
}
export function relatedTo(record, id) {
  return [
    record.personId,
    record.ownerId,
    record.engineerId,
    record.inspectorId,
    record.assetRefId,
    record.customerId,
    record.projectId,
    record.eventId,
    record.sourceFleetId,
    record.relatedRecordId,
    ...(record.relatedIds || []),
    ...(record.attendeeIds || []),
  ].includes(id);
}
export function businessCommand(records, org, id, command, actor = {}) {
  const original = originalCommand(records, org, id, command, actor);
  if (original) return original;
  const final = finalCommand(records, org, id, command, actor);
  if (final) return final;
  let next = structuredClone(records);
  const record = next.find((r) => r.id === id && r.orgId === org.id);
  assert(record, "Record not available in this company.");
  const same = () => next.filter((r) => r.orgId === org.id),
    now = new Date().toISOString();
  const find = (key, kind) => {
    const r = same().find((r) => r.id === key && (!kind || type(r) === kind));
    assert(r, "Select an existing " + (kind || "business") + " record.");
    return r;
  };
  const destination = (kind) => {
    const m = org.modules.find((m) => moduleInfo(m).type === kind);
    assert(m, "Enable the " + kind + " module first.");
    return m;
  };
  const add = (kind, values) => {
    const r = {
      ...values,
      id: crypto.randomUUID(),
      orgId: org.id,
      module: destination(kind),
      ...(kind === "maintenance" ? { requiresSupervisorReview: true } : {}),
      createdAt: now,
      createdById: actor.actorId || "",
      activity: [activityEntry(actor, "Created", "Created by " + command.kind)],
    };
    next.push(r);
    return r;
  };
  const note = (text) => {
    record.activity = [
      ...(record.activity || []),
      activityEntry(actor, command.kind, text),
    ];
  };
  const eligible = (personId, kind, date = command.date || today()) => {
    const person = find(personId, "people");
    const assessment = availabilityAssessment(person, same(), org.id, {
      kind,
      date,
      startTime: command.startTime,
      endTime: command.endTime,
      excludedRecordId: id,
      requiredQualification:
        kind === "fleet" ? record.requiredQualification : undefined,
      department: kind === "fleet" ? record.requiredDepartment : undefined,
    });
    assert(
      assessment.eligible,
      person.title + ": " + assessment.reasons.join("; "),
    );
    return person;
  };
  if (command.kind === "archive") {
    assert(
      !record.archivedAt && archiveEligibility(record),
      "Only completed, cancelled or inactive eligible records can be archived.",
    );
    assert(String(command.reason || "").trim(), "Enter an archive reason.");
    record.archivedAt = now;
    record.archiveReason = command.reason;
    record.archiveHistory = [
      ...(record.archiveHistory || []),
      {
        action: "Archived",
        at: now,
        actorId: actor.actorId || "",
        reason: command.reason,
      },
    ];
    note("Archived without deleting relationships");
  } else if (command.kind === "restore") {
    assert(record.archivedAt, "This record is not archived.");
    delete record.archivedAt;
    record.archiveHistory = [
      ...(record.archiveHistory || []),
      { action: "Restored", at: now, actorId: actor.actorId || "" },
    ];
    note("Restored to its original workflow status");
  } else if (command.kind === "generateSchedule") {
    const kind = type(record);
    assert(
      ["schedule", "maintenance", "operations"].includes(kind) &&
        record.recordType === kind + "-template",
      "Select a recurring template.",
    );
    assert(
      validDate(command.from) &&
        validDate(command.to) &&
        command.to >= command.from,
      "Choose a valid occurrence date range.",
    );
    const interval = whole(command.interval, "Repeat interval", 1, 365),
      number =
        Math.floor(
          (Date.parse(command.to) - Date.parse(command.from)) /
            86400000 /
            interval,
        ) + 1;
    assert(number <= 60, "Generate at most 60 occurrences at a time.");
    const snapshot = record.snapshot || {},
      person = find(snapshot.personId, "people");
    if (kind === "schedule")
      assert(
        snapshot.start && snapshot.end && snapshot.end > snapshot.start,
        "Shift end must follow start.",
      );
    const asset =
      kind === "maintenance" ? find(snapshot.assetRefId, "assets") : null;
    let count = 0;
    for (let i = 0; i < number; i++) {
      const date = new Date(Date.parse(command.from) + i * interval * 86400000)
        .toISOString()
        .slice(0, 10);
      if (
        same().some(
          (r) => r.createdFromTemplateId === id && r.occurrenceDate === date,
        )
      )
        continue;
      const row = {
        ...snapshot,
        title: record.title,
        ownerId: person.id,
        owner: person.title,
        personId: person.id,
        person: person.title,
        status: "Planned",
        createdFromTemplateId: id,
        occurrenceDate: date,
        dueDate: date,
        requiresSupervisorReview: kind === "maintenance",
        recordType:
          kind === "operations"
            ? "operational-check"
            : kind === "maintenance"
              ? "work-order"
              : "shift",
        approval: "Pending",
        workStage: kind === "maintenance" ? "Scheduled" : undefined,
        ...(kind === "schedule"
          ? {
              startTime: date + "T" + snapshot.start,
              endTime: date + "T" + snapshot.end,
            }
          : {}),
        ...(asset
          ? {
              assetRefId: asset.id,
              asset: asset.asset || asset.title,
              engineerId: person.id,
            }
          : {}),
        ...(kind === "operations" ? { operationDate: date, handover: [] } : {}),
        checklist: (snapshot.checklist || []).map((c) => ({
          ...c,
          done: false,
        })),
        workLogs: [],
        partsUsed: [],
      };
      const candidate = {
        ...row,
        id: crypto.randomUUID(),
        orgId: org.id,
        module: record.module,
      };
      validateDemoAssignment(candidate, candidate, next, true);
      next.push({
        ...candidate,
        createdAt: now,
        activity: [
          activityEntry(actor, "Created", "Generated from " + record.title),
        ],
      });
      count++;
    }
    note(count + " scheduled occurrences generated");
  } else if (command.kind === "vehicleCheck") {
    assert(type(record) === "fleet", "Choose a vehicle.");
    assert(validDate(command.date), "Choose a valid check date.");
    const key = command.requestId;
    assert(key, "A check identity is required.");
    if ((record.checks || []).some((c) => c.id === key)) return records;
    const driver = eligible(command.driverId, "fleet");
    const mileage = whole(
      command.mileage,
      "Mileage",
      Number(record.mileage || 0),
    );
    const questions = record.checkQuestions?.length
      ? record.checkQuestions
      : vehicleQuestions;
    assert(
      questions.every((q) => ["Pass", "Fail"].includes(command.answers?.[q])),
      "Answer every daily vehicle check.",
    );
    const failed = questions.filter((q) => command.answers[q] === "Fail");
    assert(
      !failed.length || String(command.findings || "").trim(),
      "Describe the vehicle defect.",
    );
    const check = {
      id: key,
      date: command.date || today(),
      at: now,
      driverId: driver.id,
      mileage,
      answers: command.answers,
      result: failed.length ? "Defect" : "Pass",
      comment: command.findings || "",
      evidence: command.evidence || null,
    };
    record.mileage = mileage;
    record.checks = [...(record.checks || []), check];
    record.mileageHistory = [
      ...(record.mileageHistory || []),
      { at: now, mileage, driverId: driver.id },
    ];
    record.driverId = driver.id;
    if (failed.length) {
      const defect = {
        id: crypto.randomUUID(),
        checkId: key,
        text: command.findings,
        failed,
        at: now,
        resolved: false,
      };
      record.defects = [...(record.defects || []), defect];
      record.condition = "Needs attention";
      if (command.createWork) {
        const job = add("maintenance", {
          title: "Vehicle defect: " + record.title,
          detail: command.findings,
          fault: command.findings,
          sourceFleetId: id,
          sourceCheckId: key,
          assetRefId: record.assetRefId || "",
          asset: record.registration || record.title,
          status: "Planned",
          workStage: "Reported",
          severity: "High",
          dueDate: command.date || today(),
          checklist: failed.map((text) => ({
            text: "Repair and verify " + text.toLowerCase(),
            done: false,
          })),
          partsUsed: [],
          workLogs: [],
          history: [{ at: now, text: "Raised from failed vehicle check" }],
        });
        defect.workOrderId = job.id;
      }
    }
    note("Daily check: " + check.result + " · " + driver.title);
  } else if (command.kind === "vehicleService") {
    assert(type(record) === "fleet", "Choose a vehicle.");
    const person = eligible(command.personId, "maintenance");
    assert(
      validDate(command.date) &&
        validDate(command.nextDue) &&
        command.nextDue >= command.date &&
        String(command.notes || "").trim(),
      "Record service details and a next service date on or after the service.",
    );
    const mileage = whole(
      command.mileage,
      "Mileage",
      Number(record.mileage || 0),
    );
    record.serviceHistory = [
      ...(record.serviceHistory || []),
      {
        id: crypto.randomUUID(),
        at: now,
        date: command.date,
        nextDue: command.nextDue,
        personId: person.id,
        notes: command.notes,
        mileage,
      },
    ];
    record.mileageHistory = [
      ...(record.mileageHistory || []),
      { at: now, mileage, driverId: person.id, source: "Service" },
    ];
    record.serviceDue = command.nextDue;
    record.mileage = mileage;
    note("Service recorded; reminder updated from the service record");
  } else if (command.kind === "formSubmit") {
    assert(
      record.recordType === "form-template" && record.status === "Published",
      "Publish the form before accepting responses.",
    );
    const answers = validateAnswers(record.fields, command.answers || {});
    const related = command.relatedRecordId
      ? find(command.relatedRecordId)
      : null;
    const response = add("forms", {
      recordType: "form-response",
      title: record.title + " submission",
      templateId: id,
      templateVersion: record.version || 1,
      formTitle: record.title,
      fieldSnapshot: record.fields,
      answersById: answers,
      answers: Object.fromEntries(
        record.fields
          .filter((f) => f.type !== "Section" && fieldVisible(f, answers))
          .map((f) => [f.label, answers[f.id] ?? ""]),
      ),
      relatedRecordId: related?.id || "",
      relatedIds: related ? [related.id] : [],
      status: "Submitted",
      dueDate: today(),
    });
    if (record.workflow === "Defect to maintenance") {
      assert(
        related && type(related) === "assets",
        "This defect form must be linked to an existing asset.",
      );
      const job = add("maintenance", {
        title: "Form defect: " + related.title,
        detail: Object.values(answers).flat().join(" · "),
        fault: Object.values(answers).flat().join(" · "),
        sourceFormResponseId: response.id,
        assetRefId: related.id,
        asset: related.asset || related.title,
        status: "Planned",
        workStage: "Reported",
        severity: "Medium",
        dueDate: today(),
        checklist: [],
        partsUsed: [],
        workLogs: [],
      });
      response.workOrderId = job.id;
    }
    note("Submission stored with template version " + (record.version || 1));
  } else if (command.kind === "assessTraining") {
    assert(
      record.recordType === "training-session",
      "Select a training session.",
    );
    assert(record.attendeeIds?.length, "Select session attendees.");
    assert(
      command.expiry || command.noExpiry,
      "Record certificate expiry or explicitly no expiry.",
    );
    assert(
      command.noExpiry ||
        (validDate(command.expiry) &&
          command.expiry >= (record.startTime?.slice(0, 10) || today())),
      "Certificate expiry must follow the training date.",
    );
    for (const personId of record.attendeeIds) {
      find(personId, "people");
      const outcome = command.results?.[personId];
      assert(
        ["Pass", "Fail"].includes(outcome),
        "Record a pass or fail for every attendee.",
      );
      let q = same().find(
        (r) => r.sourceSessionId === id && r.personId === personId,
      );
      if (q?.approval === "Approved") continue;
      const values = {
        recordType: "qualification",
        title: record.qualification,
        qualification: record.qualification,
        personId,
        person: find(personId).title,
        validFrom: record.startTime?.slice(0, 10) || today(),
        expiry: command.expiry || "",
        noExpiry: Boolean(command.noExpiry),
        assessmentResult: outcome,
        approval: outcome === "Pass" ? "Pending" : "Rejected",
        status: outcome === "Pass" ? "Awaiting approval" : "Failed",
        sourceSessionId: id,
        evidence: command.evidence || null,
      };
      if (q) Object.assign(q, values);
      else add("training", values);
    }
    record.status = "Complete";
    record.assessedAt = now;
    note("Assessment results created; passed qualifications await approval");
  } else if (command.kind === "correctiveSafety") {
    assert(type(record) === "safety", "Select a safety record.");
    if (record.correctiveId) return records;
    assert(
      validDate(command.dueDate),
      "Set a valid corrective-action deadline.",
    );
    const person = eligible(
      command.personId,
      command.target === "maintenance" ? "maintenance" : "projects",
      command.dueDate,
    );
    const asset = command.assetRefId
      ? find(command.assetRefId, "assets")
      : null;
    const job = add(
      command.target === "maintenance" ? "maintenance" : "projects",
      {
        recordType: command.target === "maintenance" ? "work-order" : "task",
        title: "Safety action: " + record.title,
        detail: record.action || record.detail,
        sourceSafetyId: id,
        assetRefId: asset?.id || "",
        asset: asset?.asset || asset?.title || "",
        ownerId: person.id,
        engineerId: command.target === "maintenance" ? person.id : "",
        owner: person.title,
        dueDate: command.dueDate || today(),
        status: "Planned",
        priority: "High",
        severity: "High",
        checklist: [],
        partsUsed: [],
        workLogs: [],
      },
    );
    record.correctiveId = job.id;
    note("Linked corrective action created");
  } else throw new Error("Unsupported business workflow.");
  return next;
}
export function validateCompletionRecord(record, previous, records) {
  validateFinalRecord(record, previous, records);
  if (type(record) === "maintenance" && record.requiresSupervisorReview) {
    if (
      record.completionRequestedAt ||
      record.status === "Complete" ||
      record.review === "Approved"
    ) {
      assert(
        record.engineerId &&
          records.some(
            (p) =>
              p.id === record.engineerId &&
              p.orgId === record.orgId &&
              type(p) === "people",
          ),
        "Assign a qualified engineer before requesting completion.",
      );
      assert(
        (record.checklist || []).every((i) => i.done),
        "Finish every work checklist item before requesting completion.",
      );
    }
    if (record.review === "Approved" && previous?.review !== "Approved")
      assert(
        (record.approvalHistory || []).length >
          (previous?.approvalHistory || []).length,
        "Use the supervisor approval workflow to approve completion.",
      );
    if (record.status === "Complete")
      assert(
        record.review === "Approved",
        "Submit completion for supervisor approval before closing this work order.",
      );
  }

  if (type(record) === "projects") {
    if (record.budget !== undefined)
      assert(
        Number.isFinite(Number(record.budget)) && Number(record.budget) >= 0,
        "Project budget must not be negative.",
      );
    for (const key of ["memberIds", "resourceIds"])
      for (const id of record[key] || [])
        assert(
          records.some(
            (r) =>
              r.orgId === record.orgId &&
              r.id === id &&
              type(r) === (key === "memberIds" ? "people" : "assets"),
          ),
          "Select existing project staff and equipment.",
        );
    if (record.dependsOnId) {
      const seen = new Set([record.id]);
      let id = record.dependsOnId;
      while (id) {
        assert(!seen.has(id), "Task dependencies cannot contain a cycle.");
        seen.add(id);
        const task = records.find(
          (r) =>
            r.id === id &&
            r.orgId === record.orgId &&
            type(r) === "projects" &&
            r.recordType !== "project",
        );
        assert(task, "Choose an existing task dependency.");
        id = task.dependsOnId;
      }
      if (record.status === "Complete")
        assert(
          records.find((r) => r.id === record.dependsOnId)?.status ===
            "Complete",
          "Complete the linked dependency before finishing this task.",
        );
    }
  }
  if (type(record) === "visitors") whole(record.count, "Visitor count", 0);
  if (type(record) === "donations") {
    const n = Number(
      record.recordType === "campaign" ? record.target : record.amount,
    );
    assert(Number.isFinite(n) && n > 0, "Enter a positive fundraising amount.");
    if (record.campaignId)
      assert(
        records.some(
          (r) =>
            r.id === record.campaignId &&
            r.orgId === record.orgId &&
            r.recordType === "campaign",
        ),
        "Select an existing campaign.",
      );
  }
  if (record.recordType === "form-template") {
    assert(
      ["Draft", "Published", "Archived"].includes(record.status),
      "Choose a valid form lifecycle status.",
    );
    if (record.status === "Published") validateFields(record.fields);
  }
  if (
    type(record) === "safety" &&
    (record.likelihood !== undefined || record.impact !== undefined)
  ) {
    whole(record.likelihood, "Likelihood", 1, 5);
    whole(record.impact, "Severity", 1, 5);
    assert(
      record.controls?.trim() &&
        record.affected?.trim() &&
        record.action?.trim() &&
        validDate(record.reviewDate),
      "Complete controls, affected people, actions and review date.",
    );
    if (record.status === "Reviewed" && record.correctiveId) {
      const action = records.find(
        (r) => r.id === record.correctiveId && r.orgId === record.orgId,
      );
      assert(
        action &&
          ["Complete", "Completed", "Cancelled"].includes(action.status),
        "Complete the linked corrective work before closing the safety review.",
      );
    }
  }
  if (type(record) === "training" && record.recordType !== "training-session") {
    if (record.assessmentResult === "Fail")
      assert(
        record.approval !== "Approved",
        "A failed assessment cannot be approved as a qualification.",
      );
    if (record.expiry && record.validFrom)
      assert(
        validDate(record.expiry) && record.expiry >= record.validFrom,
        "Qualification expiry must follow its valid-from date.",
      );
  }
  if (record.recordType === "training-session") {
    assert(
      record.qualification?.trim() && record.attendeeIds?.length,
      "Choose the course and attendees.",
    );
    for (const id of record.attendeeIds)
      assert(
        records.some(
          (p) =>
            p.orgId === record.orgId && p.id === id && type(p) === "people",
        ),
        "Select existing attendees.",
      );
  }
  if (record.archiveHistory && previous?.archivedAt && !record.archivedAt)
    throw new Error("Use Restore in the business archive.");
}
