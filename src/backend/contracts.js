/**
 * Adapter boundary. All resource operations return Promises; failures reject.
 * orgId is an explicit address, NEVER proof of authorization. A future remote
 * adapter must derive authority from a verified session and enforce it server-side.
 * Demo snapshots/subscriptions are a local UI projection, not a production query API.
 * See docs/BACKEND-CONTRACT.md for semantics and future adapter requirements.
 *
 * @typedef {Object} Backend
 * @property {'fictional-memory'} kind
 * @property {{getSession(): Promise<null>}} auth No real demo accounts/sessions.
 * @property {function(): Promise<Object>} load Load the authorized UI projection.
 * @property {function(function(): void): function(): void} subscribe
 * @property {function(): Object} getSnapshot Stable immutable UI projection.
 * @property {function(): number} getRevision Local change counter only.
 * @property {function(): Promise<void>} reset Demo only; restore fresh fixtures.
 * @property {{list(): Promise<Array>, create(Object): Promise<Object>, update(string, Object): Promise<void>}} organisations
 * @property {{list(string): Promise<Array>, replace(string, Array): Promise<void>}} memberships
 * @property {{list(string): Promise<Array>, replace(string, Array): Promise<void>}} entitlements
 * @property {{list(string): Promise<Array>, create(string, Object): Promise<Object>, update(string, string, Object): Promise<void>}} records
 * @property {{list(string): Promise<Array>, create(string, Object): Promise<Object>, update(string, string, Object): Promise<void>}} supportTickets
 * @property {{list(string): Promise<Array>, append(string, string): Promise<void>}} auditEvents Local demo events only; production appends must be server-owned.
 * @property {{setPlans(Function|Array): Promise<void>, setFlags(Object): Promise<void>}} demoSettings Demo only; no billing or permission changes.
 */
export const requiredPorts = {
  auth: ["getSession"],
  organisations: ["list", "create", "update"],
  memberships: ["list", "replace"],
  entitlements: ["list", "replace"],
  records: ["list", "create", "update"],
  supportTickets: ["list", "create", "update"],
  auditEvents: ["list", "append"],
  demoSettings: ["setPlans", "setFlags"],
};
export function assertBackend(backend) {
  for (const method of [
    "load",
    "subscribe",
    "getSnapshot",
    "getRevision",
    "reset",
  ])
    if (typeof backend?.[method] !== "function")
      throw new Error(`Missing backend method: ${method}`);
  for (const [port, methods] of Object.entries(requiredPorts))
    for (const method of methods)
      if (typeof backend?.[port]?.[method] !== "function")
        throw new Error(`Missing backend port: ${port}.${method}`);
  return backend;
}
