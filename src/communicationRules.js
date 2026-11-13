export const noticeRelevant = (notice, actorId, department) =>
  notice.audience === "Company" ||
  (notice.audience === "Department" && notice.department === department) ||
  (notice.audience === "Staff" && (notice.recipients || []).includes(actorId));
