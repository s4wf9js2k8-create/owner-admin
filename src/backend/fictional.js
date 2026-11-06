import {
  createOrganisation,
  starter,
  plans,
  seedRecords,
  updateRecord,
} from "../model.js";

const copy = (value) => structuredClone(value);
export function fictionalFixtures() {
  return {
    orgs: copy(starter),
    records: seedRecords(starter),
    logs: [],
    tickets: [
      {
        id: "ticket-1",
        orgId: starter[0].id,
        subject: "Configure volunteer attendance",
        priority: "Normal",
        status: "Open",
        history: [
          {
            kind: "Customer message (fictional)",
            text: "Can the attendance module be enabled for our demo?",
            time: "6 November 2026",
          },
        ],
      },
      {
        id: "ticket-2",
        orgId: starter[2].id,
        subject: "Review inspection workflow",
        priority: "High",
        status: "In progress",
        history: [],
      },
    ],
    plans: copy(plans),
    flags: { customerPreview: true },
  };
}
const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
/** Fictional in-memory data only. No identity, persistence or security boundary.
 * @returns {import('./contracts.js').Backend}
 */
export function createFictionalBackend({
  fixtures = fictionalFixtures,
  beforeLoad = async () => {},
} = {}) {
  let state = freeze(copy(fixtures()));
  let revision = 0;
  const listeners = new Set();
  const publish = (next) => {
    state = freeze(copy(next));
    revision++;
    listeners.forEach((fn) => fn());
  };
  const organisation = (orgId) => {
    const org = state.orgs.find((o) => o.id === orgId);
    if (!org) throw new Error("Unknown example organisation.");
    return org;
  };
  // These checks catch demo mistakes; every visitor can bypass them in their browser.
  const scoped = (rows, orgId) => {
    organisation(orgId);
    return rows.filter((r) => r.orgId === orgId);
  };
  const patchOrg = (id, patch) => {
    organisation(id);
    if ("id" in patch)
      throw new Error("Example organisation ID cannot change.");
    publish({
      ...state,
      orgs: state.orgs.map((o) => (o.id === id ? { ...o, ...copy(patch) } : o)),
    });
  };
  return {
    kind: "fictional-memory",
    auth: { getSession: async () => null },
    load: async () => {
      await beforeLoad();
      return copy(state);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getRevision: () => revision,
    reset: async () => publish(fixtures()),
    organisations: {
      list: async () => copy(state.orgs),
      create: async (values) => {
        const org = createOrganisation(values);
        if (state.orgs.some((o) => o.id === org.id))
          throw new Error("Duplicate example organisation ID.");
        publish({
          ...state,
          orgs: [...state.orgs, org],
          records: [...state.records, ...seedRecords([org])],
        });
        return copy(org);
      },
      update: async (id, patch) => {
        if ("modules" in patch || "admins" in patch)
          throw new Error("Use entitlements or memberships port.");
        patchOrg(id, patch);
      },
    },
    memberships: {
      list: async (orgId) => copy(organisation(orgId).admins),
      replace: async (orgId, members) => patchOrg(orgId, { admins: members }),
    },
    entitlements: {
      list: async (orgId) => copy(organisation(orgId).modules),
      replace: async (orgId, enabled) => patchOrg(orgId, { modules: enabled }),
    },
    records: {
      list: async (orgId) => copy(scoped(state.records, orgId)),
      create: async (orgId, values) => {
        const org = organisation(orgId);
        if (
          (values.orgId && values.orgId !== orgId) ||
          !org.modules.includes(values.module)
        )
          throw new Error("Invalid example record scope or module.");
        const record = { ...copy(values), orgId, id: crypto.randomUUID() };
        publish({ ...state, records: [...state.records, record] });
        return copy(record);
      },
      update: async (orgId, id, patch) => {
        const record = scoped(state.records, orgId).find((r) => r.id === id);
        if (!record || !organisation(orgId).modules.includes(record.module))
          throw new Error("Example record unavailable.");
        if ("orgId" in patch || "id" in patch || "module" in patch)
          throw new Error("Example record identity cannot change.");
        publish({
          ...state,
          records: updateRecord(state.records, orgId, id, patch),
        });
      },
    },
    supportTickets: {
      list: async (orgId) => copy(scoped(state.tickets, orgId)),
      create: async (orgId, values) => {
        organisation(orgId);
        if (values.orgId && values.orgId !== orgId)
          throw new Error("Invalid example ticket scope.");
        const ticket = { ...copy(values), orgId, id: crypto.randomUUID() };
        publish({ ...state, tickets: [...state.tickets, ticket] });
        return copy(ticket);
      },
      update: async (orgId, id, patch) => {
        if (!scoped(state.tickets, orgId).some((t) => t.id === id))
          throw new Error("Example ticket unavailable.");
        if ("orgId" in patch || "id" in patch)
          throw new Error("Example ticket identity cannot change.");
        publish({
          ...state,
          tickets: state.tickets.map((t) =>
            t.id === id ? { ...t, ...copy(patch) } : t,
          ),
        });
      },
    },
    auditEvents: {
      list: async (orgId) => copy(scoped(state.logs, orgId)),
      append: async (orgId, event) => {
        organisation(orgId);
        publish({
          ...state,
          logs: [
            {
              id: crypto.randomUUID(),
              orgId,
              event,
              time: new Date().toLocaleString("en-GB"),
            },
            ...state.logs,
          ].slice(0, 200),
        });
      },
    },
    demoSettings: {
      setPlans: async (updater) =>
        publish({
          ...state,
          plans:
            typeof updater === "function"
              ? updater(copy(state.plans))
              : updater,
        }),
      setFlags: async (flags) => publish({ ...state, flags }),
    },
  };
}
