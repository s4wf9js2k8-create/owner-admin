/**
 * OFFLINE POLICY MODEL ONLY. Not imported by the public demo or a server.
 * `trusted` represents a verified principal and freshly loaded authoritative
 * state supplied by a hypothetical server. This module verifies no tokens,
 * runs no Firebase Rules, and cannot make browser-supplied state trustworthy.
 */
const actionsByRole = new Map([
  ["viewer", new Set(["read", "list"])],
  ["member", new Set(["read", "list", "create", "update"])],
  [
    "organisation-admin",
    new Set(["read", "list", "create", "update", "delete"]),
  ],
]);
const deny = Object.freeze({ allowed: false });
const isId = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const onlyKeys = (value, keys) =>
  isObject(value) && Object.keys(value).every((key) => keys.includes(key));
const validFields = (data, creating) => {
  if (
    !onlyKeys(data, ["title", "detail", "status"]) ||
    !Object.keys(data).length
  )
    return false;
  if (
    creating &&
    !["title", "detail", "status"].every((key) => Object.hasOwn(data, key))
  )
    return false;
  return Object.entries(data).every(([key, value]) => {
    if (key === "status")
      return ["Planned", "In progress", "Complete"].includes(value);
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= (key === "title" ? 100 : 150)
    );
  });
};
export const membershipKey = (orgId, uid) => `${orgId}/${uid}`;
export const moduleKey = (orgId, moduleId) => `${orgId}/${moduleId}`;
export const recordKey = (orgId, moduleId, id) => `${orgId}/${moduleId}/${id}`;

/**
 * Returns a deny or a grant bound to one path; never returns customer data.
 * Untrusted request: {action, target:{orgId,moduleId,id?}, data?, limit?}.
 * Trusted state uses Maps, not request-provided roles/claims/memberships.
 * A grant is a point-in-time decision, not a cacheable capability.
 */
export function authorizeRecord(trusted, request) {
  if (!onlyKeys(request, ["action", "target", "data", "limit"])) return deny;
  const { action, target, data, limit } = request;
  if (!onlyKeys(target, ["orgId", "moduleId", "id"])) return deny;
  const { orgId, moduleId, id } = target;
  const uid = trusted?.principal?.uid;
  if (![orgId, moduleId, uid].every(isId)) return deny;
  for (const collection of [
    "accounts",
    "organisations",
    "memberships",
    "entitlements",
    "records",
  ])
    if (!(trusted[collection] instanceof Map)) return deny;
  const account = trusted.accounts.get(uid);
  const organisation = trusted.organisations.get(orgId);
  const member = trusted.memberships.get(membershipKey(orgId, uid));
  const entitlement = trusted.entitlements.get(moduleKey(orgId, moduleId));
  if (account?.status !== "active" || organisation?.status !== "active")
    return deny;
  if (
    member?.status !== "active" ||
    member.uid !== uid ||
    member.orgId !== orgId
  )
    return deny;
  if (
    !actionsByRole.get(member.role)?.has(action) ||
    entitlement?.enabled !== true
  )
    return deny;
  if (entitlement.orgId !== orgId || entitlement.moduleId !== moduleId)
    return deny;
  if (action === "list") {
    if (
      id !== undefined ||
      data !== undefined ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      return deny;
  } else {
    if (!isId(id) || limit !== undefined) return deny;
    const existing = trusted.records.get(recordKey(orgId, moduleId, id));
    if (action === "create") {
      if (existing || !validFields(data, true)) return deny;
    } else {
      if (
        !existing ||
        existing.orgId !== orgId ||
        existing.moduleId !== moduleId ||
        existing.id !== id
      )
        return deny;
      if (action === "update" ? !validFields(data, false) : data !== undefined)
        return deny;
    }
  }
  return {
    allowed: true,
    scope: { orgId, moduleId, ...(id === undefined ? {} : { id }) },
  };
}
