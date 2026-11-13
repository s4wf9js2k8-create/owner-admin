import { availabilityAssessment } from "./staffEligibility.js";
import { moduleInfo } from "./customerModules.js";
export const actorFor = (actor = {}) => ({
  actorId: actor.actorId || "",
  actorName: actor.actorName || "Fictional demo user",
  role: actor.role || "Demo",
});
export const activityEntry = (actor, action, details) => ({
  id: crypto.randomUUID(),
  at: new Date().toISOString(),
  ...actorFor(actor),
  action,
  details,
});
export function approvalType(r) {
  const type = moduleInfo(r.module).type;
  if (r.correctionRequest?.status === "Pending") return "Timesheet correction";
  if (
    type === "projects" &&
    r.recordType !== "project" &&
    r.approval === "Pending" &&
    !r.approvalNeedsChanges
  )
    return "Task approval";
  if (type === "finance" && r.documentStatus === "Awaiting approval")
    return "Quotation";
  if (
    type === "maintenance" &&
    r.status === "Complete" &&
    r.review !== "Approved"
  )
    return "Maintenance completion";
  if (
    type === "inspections" &&
    r.submittedAt &&
    r.approval === "Pending" &&
    !r.approvalNeedsChanges
  )
    return "Inspection results";
  if (
    ["leave", "timesheets", "documents"].includes(type) &&
    (r.approval || "Pending") === "Pending" &&
    !r.approvalNeedsChanges &&
    (type !== "timesheets" || r.endTime)
  )
    return {
      leave: "Leave request",
      timesheets: "Timesheet",
      documents: "Document review",
    }[type];
  if (r.recordType === "purchase-request" && r.approval === "Pending")
    return "Purchase request";
  return "";
}
export const approvalToken = (r) =>
  JSON.stringify([
    approvalType(r),
    r.approval,
    r.review,
    r.documentStatus,
    r.submittedAt,
    r.correctionRequest?.at,
    r.approvalHistory?.length || 0,
  ]);
export const requesterId = (r) =>
  r.correctionRequest?.requesterId ||
  r.requestedById ||
  r.createdById ||
  r.personId ||
  r.ownerId ||
  r.engineerId ||
  r.inspectorId ||
  "";
export function decideApproval(record, request, org, records) {
  if (!approvalType(record) || request.token !== approvalToken(record))
    throw new Error("Approval is stale or already decided.");
  const actor = records.find(
    (p) =>
      p.orgId === org.id &&
      p.id === request.actorId &&
      moduleInfo(p.module).type === "people",
  );
  if (!actor || actor.employmentStatus !== "Active")
    throw new Error("Select an active staff profile before deciding.");
  const requester =
    requesterId(record) ||
    records.find(
      (p) =>
        p.orgId === org.id &&
        moduleInfo(p.module).type === "people" &&
        p.title === record.person,
    )?.id;
  if (
    org.workspaceConfig?.disallowSelfApproval !== false &&
    (requester === actor.id ||
      [
        record.personId,
        record.ownerId,
        record.engineerId,
        record.inspectorId,
      ].includes(actor.id) ||
      [record.person, record.owner, record.inspector].includes(actor.title))
  )
    throw new Error("Company rules prevent self-approval.");
  if (record.approverId && record.approverId !== actor.id)
    throw new Error("This request is assigned to another approver.");
  if (
    !["Approve", "Reject", "Request changes"].includes(request.decision) ||
    !String(request.comment || "").trim()
  )
    throw new Error("Choose a decision and enter a reason.");
  const approved = request.decision === "Approve",
    changes = request.decision === "Request changes",
    type = moduleInfo(record.module).type;
  let patch = {
    approval: approved ? "Approved" : changes ? "Pending" : "Rejected",
    approvalNeedsChanges: changes,
  };
  if (record.correctionRequest?.status === "Pending") {
    const correction = record.correctionRequest;
    if (
      !correction.startTime ||
      !correction.endTime ||
      !Number.isFinite(Date.parse(correction.startTime)) ||
      !Number.isFinite(Date.parse(correction.endTime)) ||
      correction.endTime <= correction.startTime ||
      !Number.isFinite(Number(correction.breakMinutes)) ||
      Number(correction.breakMinutes) < 0 ||
      Number(correction.breakMinutes) >
        (Date.parse(correction.endTime) - Date.parse(correction.startTime)) /
          60000
    )
      throw new Error("Invalid timesheet correction.");
    patch = {
      ...(approved
        ? {
            startTime: correction.startTime,
            endTime: correction.endTime,
            breakMinutes: Number(correction.breakMinutes),
            approval: "Approved",
            status: "Complete",
          }
        : {}),
      correctionRequest: {
        ...correction,
        status: approved
          ? "Approved"
          : changes
            ? "Changes requested"
            : "Rejected",
      },
    };
  } else if (type === "finance")
    patch = {
      documentStatus: approved ? "Approved" : changes ? "Draft" : "Rejected",
      paymentStatus: approved ? "Approved" : changes ? "Draft" : "Rejected",
    };
  else if (type === "maintenance")
    patch = {
      review: approved ? "Approved" : "Requires changes",
      status: approved ? "Complete" : "In progress",
      workStage: approved ? "Completed" : "In progress",
    };
  else if (type === "inspections")
    patch = {
      ...patch,
      status: approved ? "Complete" : "In progress",
      ...(!approved ? { submittedAt: "" } : {}),
      reviewedAt: new Date().toISOString(),
    };
  return {
    ...patch,
    approvalHistory: [
      ...(record.approvalHistory || []),
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.title,
        decision: request.decision,
        comment: request.comment.trim(),
        type: approvalType(record),
      },
    ],
  };
}
export const automationTemplates = [
  {
    trigger: "Inspection failed",
    action: "Create corrective maintenance",
    target: "maintenance",
  },
  {
    trigger: "Maintenance completed",
    action: "Create follow-up inspection",
    target: "inspections",
  },
  {
    trigger: "Task completed",
    action: "Create next recurring task",
    target: "projects",
  },
];
export function processAutomations(records, changed, org, runs = []) {
  let result = [...records],
    history = [...runs];
  for (const rule of (org.workspaceConfig?.automationRules || []).filter(
    (r) => r.enabled,
  )) {
    const template = automationTemplates.find(
        (t) => t.trigger === rule.trigger && t.action === rule.action,
      ),
      type = moduleInfo(changed.module).type;
    if (!template) continue;
    const matches =
      rule.trigger === "Inspection failed"
        ? type === "inspections" && changed.result === "Fail"
        : rule.trigger === "Maintenance completed"
          ? type === "maintenance" && changed.status === "Complete"
          : type === "projects" &&
            changed.recordType !== "project" &&
            changed.status === "Complete" &&
            ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].includes(
              changed.recurrence,
            );
    if (!matches || (rule.priority && changed.priority !== rule.priority))
      continue;
    const key = rule.id + ":" + changed.id;
    if (history.some((h) => h.key === key && h.status === "Success")) continue;
    const at = new Date().toISOString(),
      target = org.modules.find((m) => moduleInfo(m).type === template.target);
    if (!target) {
      history.push({
        id: crypto.randomUUID(),
        key,
        at,
        ruleId: rule.id,
        sourceId: changed.id,
        status: "Error",
        detail: "Enable the target module before retrying.",
      });
      continue;
    }
    let existing =
      rule.trigger === "Inspection failed"
        ? result.find(
            (r) => r.orgId === org.id && r.sourceInspectionId === changed.id,
          )
        : result.find(
            (r) =>
              r.orgId === org.id &&
              ((r.automationSourceId === changed.id &&
                moduleInfo(r.module).type === template.target) ||
                (rule.trigger === "Task completed" &&
                  r.originId === changed.id)),
          );
    const reused = Boolean(existing);
    if (!existing) {
      let dueDate = changed.dueDate || at.slice(0, 10);
      if (rule.trigger === "Task completed") {
        const date = new Date(dueDate + "T12:00:00Z");
        if (Number.isNaN(date.getTime())) {
          history.push({
            id: crypto.randomUUID(),
            key,
            at,
            ruleId: rule.id,
            sourceId: changed.id,
            status: "Error",
            detail: "Task needs a valid due date.",
          });
          continue;
        }
        if (changed.recurrence === "Yearly")
          date.setUTCFullYear(date.getUTCFullYear() + 1);
        else if (changed.recurrence === "Quarterly")
          date.setUTCMonth(date.getUTCMonth() + 3);
        else if (changed.recurrence === "Monthly")
          date.setUTCMonth(date.getUTCMonth() + 1);
        else
          date.setUTCDate(
            date.getUTCDate() + (changed.recurrence === "Daily" ? 1 : 7),
          );
        dueDate = date.toISOString().slice(0, 10);
      }
      existing = {
        id: crypto.randomUUID(),
        orgId: org.id,
        module: target,
        title:
          (template.target === "maintenance"
            ? "Corrective action: "
            : template.target === "inspections"
              ? "Follow-up inspection: "
              : "Recurring: ") + changed.title,
        detail: "Generated by active-session rule: " + rule.name,
        status: "Planned",
        priority: changed.priority || "Normal",
        dueDate,
        assetRefId: changed.assetRefId || "",
        asset: changed.asset || "",
        owner: "",
        result: "Pending",
        approval: "Pending",
        checklist: [],
        partsUsed: [],
        workLogs: [],
        createdAt: at,
        automationSourceId: changed.id,
        automationRuleId: rule.id,
        ...(template.target === "maintenance"
          ? {
              sourceInspectionId: changed.id,
              fault: changed.findings || "Resolve failed inspection findings",
              severity: "High",
            }
          : {}),
        ...(template.target === "projects"
          ? {
              recordType: "task",
              recurrence: changed.recurrence,
              ownerId: changed.ownerId || "",
              owner: changed.owner || "",
              projectId: changed.projectId || "",
            }
          : {}),
      };
      if (template.target === "projects") {
        const assigned = records.find(
          (p) =>
            p.orgId === org.id &&
            moduleInfo(p.module).type === "people" &&
            (p.id === existing.ownerId || p.title === existing.owner),
        );
        if (
          !assigned ||
          !availabilityAssessment(assigned, records, org.id, {
            kind: "projects",
            date: dueDate,
          }).eligible
        ) {
          existing.owner = "";
          existing.ownerId = "";
          existing.detail += " · Previous assignee needs availability review.";
        }
      }
      existing.activity = [
        activityEntry(
          { actorName: "Session automation", actorId: rule.id },
          "Created",
          rule.name,
        ),
      ];
      result.push(existing);
    }
    history.push({
      id: crypto.randomUUID(),
      key,
      at,
      ruleId: rule.id,
      sourceId: changed.id,
      targetId: existing.id,
      status: "Success",
      detail: template.action + (reused ? " (reused linked record)" : ""),
    });
  }
  return { records: result, runs: history.slice(-200) };
}
export function recordInScope(record, scope = {}, person, records = []) {
  const owner =
    (record.id === person?.id && moduleInfo(record.module).type === "people") ||
    ([
      record.createdById,
      record.personId,
      record.ownerId,
      record.engineerId,
      record.inspectorId,
      record.custodianId,
    ].includes(person?.id) &&
      Boolean(person?.id)) ||
    ([record.owner, record.person, record.inspector].includes(person?.title) &&
      Boolean(person?.title));
  const related = records.find(
    (p) =>
      p.orgId === record.orgId &&
      moduleInfo(p.module).type === "people" &&
      ([
        record.personId,
        record.ownerId,
        record.engineerId,
        record.inspectorId,
      ].includes(p.id) ||
        [record.owner, record.person].includes(p.title)),
  );
  if (record.sensitive && !scope.sensitive) return false;
  if (scope.department && (record.team || related?.team) !== scope.department)
    return false;
  if (
    scope.location &&
    (record.location ||
      related?.location ||
      records.find(
        (a) => a.id === record.assetRefId && a.orgId === record.orgId,
      )?.location) !== scope.location
  )
    return false;
  if (
    scope.ownership === "Mine" &&
    !["communications"].includes(moduleInfo(record.module).type) &&
    !["report-config"].includes(record.recordType) &&
    !owner
  )
    return false;
  return true;
}
