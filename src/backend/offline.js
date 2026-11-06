/** Offline service harness only. Never mount this factory as a public endpoint.
 * Closure-owned state models a trusted service; fake login is NOT authentication.
 * No IO, storage, credentials, demo imports, or vendor SDKs.
 */
export class BackendError extends Error {
  constructor(code) {
    super(code);
    this.name = "BackendError";
    this.code = code;
  }
}
const fail = (code) => {
  throw new BackendError(code);
};
const copy = (value) => structuredClone(value);
const roles = {
  viewer: ["read"],
  staff: ["read", "write"],
  manager: ["read", "write", "delete"],
  "organisation-admin": ["read", "write", "delete", "admin"],
};
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const fields = (value, allowed) => {
  if (
    !object(value) ||
    !Object.keys(value).length ||
    Object.keys(value).some((k) => !allowed.includes(k))
  )
    fail("INVALID_INPUT");
};
const text = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const checkVersion = (row, version) => {
  if (!Number.isInteger(version) || row.version !== version) fail("CONFLICT");
};

export function createOfflineBackend({ now = () => Date.now() } = {}) {
  const accounts = new Map(
    ["alice", "bob", "viewer", "staff", "guest", "owner"].map((id) => [
      id,
      { id, status: "active", platformOwner: id === "owner" },
    ]),
  );
  const organisations = new Map(
    ["alpha", "beta"].map((id) => [
      id,
      {
        id,
        name: `Fictional ${id}`,
        status: "active",
        modules: ["tasks"],
        features: { reporting: true },
        version: 1,
      },
    ]),
  );
  const memberships = new Map([
    [
      "alpha/alice",
      {
        orgId: "alpha",
        uid: "alice",
        role: "organisation-admin",
        status: "active",
        version: 1,
      },
    ],
    [
      "beta/bob",
      {
        orgId: "beta",
        uid: "bob",
        role: "organisation-admin",
        status: "active",
        version: 1,
      },
    ],
    ...["viewer", "staff"].map((uid) => [
      `alpha/${uid}`,
      { orgId: "alpha", uid, role: uid, status: "active", version: 1 },
    ]),
  ]);
  const packages = new Map([
    [
      "Essential",
      { name: "Essential", modules: ["tasks"], monthly: null, version: 1 },
    ],
    [
      "Professional",
      {
        name: "Professional",
        modules: ["tasks", "reporting"],
        monthly: null,
        version: 1,
      },
    ],
    [
      "Enterprise",
      {
        name: "Enterprise",
        modules: ["tasks", "reporting"],
        monthly: null,
        version: 1,
      },
    ],
  ]);
  for (const org of organisations.values())
    Object.assign(org, {
      package: "Essential",
      color: "#28533a",
      overrides: [],
    });
  const requests = new Map();
  const validModules = (list) =>
    Array.isArray(list) &&
    list.every((m) => ["tasks", "reporting"].includes(m)) &&
    new Set(list).size === list.length &&
    (!list.includes("reporting") || list.includes("tasks"));
  const records = new Map();
  const sessions = new Map();
  const invites = new Map();
  const events = [];
  const audit = (uid, orgId, action, target, outcome) =>
    events.push({
      id: crypto.randomUUID(),
      uid,
      orgId,
      action,
      target,
      outcome,
      time: now(),
    });
  const principal = (token) => {
    const session = sessions.get(token);
    const account = accounts.get(session?.uid);
    if (!session || session.expires <= now() || account?.status !== "active")
      fail("UNAUTHENTICATED");
    return account;
  };
  const authorize = (token, orgId, action, module) => {
    const actor = principal(token);
    const org = organisations.get(orgId);
    const member = memberships.get(`${orgId}/${actor.id}`);
    if (
      org?.status !== "active" ||
      member?.status !== "active" ||
      !Object.hasOwn(roles, member.role) ||
      !roles[member.role].includes(action) ||
      (module !== undefined && !org.modules.includes(module))
    )
      fail("FORBIDDEN");
    return actor;
  };
  // Each operation executes synchronously in one turn: state and audit publish together.
  const run = async (token, orgId, action, target, fn) => {
    try {
      return copy(fn());
    } catch (error) {
      audit(
        sessions.get(token)?.uid ?? "anonymous",
        organisations.has(orgId) ? orgId : null,
        action,
        typeof target === "string" ? target.slice(0, 80) : null,
        error.code ?? "FAILED",
      );
      throw error;
    }
  };
  const recordFields = (data, creating = false) => {
    fields(data, ["title", "detail", "progress"]);
    if ((creating || "title" in data) && !text(data.title, 100))
      fail("INVALID_INPUT");
    if (
      "detail" in data &&
      (typeof data.detail !== "string" || data.detail.length > 1000)
    )
      fail("INVALID_INPUT");
    if (
      "progress" in data &&
      (!Number.isInteger(data.progress) ||
        data.progress < 0 ||
        data.progress > 100)
    )
      fail("INVALID_INPUT");
  };
  const client = (token) => {
    const invoke = (org, action, target, fn) =>
      run(token, org, action, target, fn);
    const changed = (org, action, target, row) => {
      audit(principal(token).id, org, action, target, "SUCCESS");
      return row;
    };
    const find = (org, id) => {
      const row = records.get(id);
      if (!row || row.orgId !== org) fail("NOT_FOUND");
      return row;
    };
    const owner = () => {
      const actor = principal(token);
      if (!actor.platformOwner) fail("FORBIDDEN");
      return actor;
    };
    const company = (org) => {
      const row = organisations.get(org);
      if (!row) fail("NOT_FOUND");
      return row;
    };
    return {
      kind: "offline-memory",
      packages: {
        list: () =>
          invoke(null, "packages.list", null, () => {
            principal(token);
            return [...packages.values()];
          }),
        update: (name, patch, version) =>
          invoke(null, "packages.update", name, () => {
            owner();
            const row = packages.get(name);
            if (!row) fail("NOT_FOUND");
            fields(patch, ["modules", "monthly"]);
            if (
              ("modules" in patch && !validModules(patch.modules)) ||
              ("monthly" in patch &&
                patch.monthly !== null &&
                (!Number.isInteger(patch.monthly) ||
                  patch.monthly < 0 ||
                  patch.monthly > 100000))
            )
              fail("INVALID_INPUT");
            checkVersion(row, version);
            Object.assign(row, copy(patch), { version: row.version + 1 });
            // Template changes apply to future assignments only, never silently to existing tenants.
            return changed(null, "packages.update", name, row);
          }),
      },
      companies: {
        list: () =>
          invoke(null, "companies.list", null, () => {
            owner();
            return [...organisations.values()];
          }),
        create: (values) =>
          invoke(null, "companies.create", null, () => {
            owner();
            fields(values, ["name", "package", "color"]);
            if (
              !text(values.name, 100) ||
              !packages.has(values.package) ||
              !/^#[0-9a-fA-F]{6}$/.test(values.color)
            )
              fail("INVALID_INPUT");
            const row = {
              id: crypto.randomUUID(),
              name: values.name.trim(),
              package: values.package,
              color: values.color,
              status: "active",
              modules: copy(packages.get(values.package).modules),
              features: { reporting: true },
              overrides: [],
              version: 1,
            };
            organisations.set(row.id, row);
            return changed(row.id, "companies.create", row.id, row);
          }),
        update: (org, patch, version) =>
          invoke(org, "companies.update", org, () => {
            owner();
            const row = company(org);
            fields(patch, ["name", "package", "color", "status", "overrides"]);
            if (
              ("name" in patch && !text(patch.name, 100)) ||
              ("package" in patch && !packages.has(patch.package)) ||
              ("color" in patch && !/^#[0-9a-fA-F]{6}$/.test(patch.color)) ||
              ("status" in patch &&
                !["active", "suspended"].includes(patch.status)) ||
              ("overrides" in patch &&
                (!Array.isArray(patch.overrides) ||
                  patch.overrides.some(
                    (m) => !["tasks", "reporting"].includes(m),
                  )))
            )
              fail("INVALID_INPUT");
            const next = { ...row, ...copy(patch) };
            if ("package" in patch || "overrides" in patch)
              next.modules = [
                ...new Set([
                  ...packages.get(next.package).modules,
                  ...next.overrides,
                ]),
              ];
            if (!validModules(next.modules)) fail("INVALID_INPUT");
            checkVersion(row, version);
            Object.assign(row, next, { version: row.version + 1 });
            return changed(org, "companies.update", org, row);
          }),
        inviteAdmin: (org, uid) =>
          invoke(org, "companies.invite", uid, () => {
            owner();
            const row = company(org);
            if (
              row.status !== "active" ||
              !accounts.has(uid) ||
              memberships.has(`${org}/${uid}`)
            )
              fail("INVALID_INPUT");
            const secret = crypto.randomUUID();
            invites.set(secret, {
              org,
              uid,
              role: "organisation-admin",
              inviter: principal(token).id,
              expires: now() + 3600000,
            });
            changed(org, "companies.invite", uid, {});
            return { token: secret, mocked: true };
          }),
      },
      workspace: {
        get: (org) =>
          invoke(org, "workspace.get", org, () => {
            authorize(token, org, "read");
            return company(org);
          }),
        requests: (org) =>
          invoke(org, "requests.list", org, () => {
            authorize(token, org, "read");
            return [...requests.values()].filter((r) => r.orgId === org);
          }),
        request: (org, values) =>
          invoke(org, "requests.create", org, () => {
            const actor = authorize(token, org, "admin");
            fields(values, ["package", "feature"]);
            if (
              Object.keys(values).length !== 1 ||
              ("package" in values
                ? !packages.has(values.package) ||
                  values.package === company(org).package
                : values.feature !== "reporting" ||
                  company(org).modules.includes("reporting"))
            )
              fail("INVALID_INPUT");
            if (
              [...requests.values()].some(
                (r) => r.orgId === org && r.status === "pending",
              )
            )
              fail("CONFLICT");
            const row = {
              id: crypto.randomUUID(),
              orgId: org,
              ...copy(values),
              uid: actor.id,
              status: "pending",
              version: 1,
            };
            requests.set(row.id, row);
            return changed(org, "requests.create", row.id, row);
          }),
      },
      approvals: {
        list: () =>
          invoke(null, "approvals.list", null, () => {
            owner();
            return [...requests.values()];
          }),
        decide: (id, decision, version, companyVersion) =>
          invoke(null, "approvals.decide", id, () => {
            owner();
            const request = requests.get(id);
            if (!request) fail("NOT_FOUND");
            if (!["approved", "rejected"].includes(decision))
              fail("INVALID_INPUT");
            checkVersion(request, version);
            if (request.status !== "pending") fail("CONFLICT");
            const org = company(request.orgId);
            checkVersion(org, companyVersion);
            if (org.status !== "active") fail("FORBIDDEN");
            if (decision === "approved") {
              if (request.feature)
                org.overrides = [
                  ...new Set([...org.overrides, request.feature]),
                ];
              else org.package = request.package;
              org.modules = [
                ...new Set([
                  ...packages.get(org.package).modules,
                  ...org.overrides,
                ]),
              ];
              org.version++;
            }
            request.status = decision;
            request.version++;
            return changed(org.id, "approvals.decide", id, request);
          }),
      },
      auth: {
        getSession: async () => ({ uid: principal(token).id, mocked: true }),
        logout: async () => {
          sessions.delete(token);
        },
      },
      organisations: {
        list: () =>
          invoke(null, "organisations.list", null, () => {
            const actor = principal(token);
            return [...organisations.values()].filter(
              (org) =>
                org.status === "active" &&
                memberships.get(`${org.id}/${actor.id}`)?.status === "active",
            );
          }),
        update: (org, patch, version) =>
          invoke(org, "organisation.update", org, () => {
            authorize(token, org, "admin");
            fields(patch, ["name"]);
            if (!text(patch.name, 100)) fail("INVALID_INPUT");
            const row = organisations.get(org);
            checkVersion(row, version);
            Object.assign(row, patch, { version: row.version + 1 });
            return changed(org, "organisation.update", org, row);
          }),
      },
      memberships: {
        list: (org) =>
          invoke(org, "memberships.list", null, () => {
            authorize(token, org, "admin");
            return [...memberships.values()].filter((m) => m.orgId === org);
          }),
        update: (org, uid, patch, version) =>
          invoke(org, "membership.update", uid, () => {
            const actor = authorize(token, org, "admin");
            fields(patch, ["role", "status"]);
            if (
              actor.id === uid ||
              ("role" in patch && !Object.hasOwn(roles, patch.role)) ||
              ("status" in patch &&
                !["active", "revoked"].includes(patch.status))
            )
              fail("INVALID_INPUT");
            const row = memberships.get(`${org}/${uid}`);
            if (!row) fail("NOT_FOUND");
            checkVersion(row, version);
            Object.assign(row, patch, { version: row.version + 1 });
            return changed(org, "membership.update", uid, row);
          }),
      },
      entitlements: {
        list: (org) =>
          invoke(org, "entitlements.list", null, () => {
            authorize(token, org, "read");
            const { modules, features, version } = organisations.get(org);
            return { modules, features, version };
          }),
      },
      records: {
        list: (org, module, limit = 100) =>
          invoke(org, "records.list", null, () => {
            authorize(token, org, "read", module);
            if (!Number.isInteger(limit) || limit < 1 || limit > 100)
              fail("INVALID_INPUT");
            return [...records.values()]
              .filter((r) => r.orgId === org && r.module === module)
              .slice(0, limit);
          }),
        get: (org, id) =>
          invoke(org, "records.get", id, () => {
            authorize(token, org, "read");
            const row = find(org, id);
            authorize(token, org, "read", row.module);
            return row;
          }),
        create: (org, values) =>
          invoke(org, "records.create", null, () => {
            fields(values, ["module", "title", "detail", "progress"]);
            const { module, ...data } = values;
            authorize(token, org, "write", module);
            if (typeof module !== "string") fail("INVALID_INPUT");
            recordFields(data, true);
            const row = {
              id: crypto.randomUUID(),
              orgId: org,
              module,
              detail: "",
              progress: 0,
              ...data,
              version: 1,
            };
            records.set(row.id, row);
            return changed(org, "records.create", row.id, row);
          }),
        update: (org, id, patch, version) =>
          invoke(org, "records.update", id, () => {
            authorize(token, org, "write");
            const row = find(org, id);
            authorize(token, org, "write", row.module);
            recordFields(patch);
            checkVersion(row, version);
            Object.assign(row, patch, { version: row.version + 1 });
            return changed(org, "records.update", id, row);
          }),
        delete: (org, id, version) =>
          invoke(org, "records.delete", id, () => {
            authorize(token, org, "delete");
            const row = find(org, id);
            authorize(token, org, "delete", row.module);
            checkVersion(row, version);
            records.delete(id);
            return changed(org, "records.delete", id, { id });
          }),
      },
      auditEvents: {
        list: (org) =>
          invoke(org, "audit.list", null, () => {
            authorize(token, org, "admin");
            return events.filter((e) => e.orgId === org);
          }),
      },
      invitations: {
        create: (org, uid, role) =>
          invoke(org, "invite.create", null, () => {
            authorize(token, org, "admin");
            if (
              !accounts.has(uid) ||
              !Object.hasOwn(roles, role) ||
              memberships.has(`${org}/${uid}`)
            )
              fail("INVALID_INPUT");
            const secret = crypto.randomUUID();
            invites.set(secret, {
              org,
              uid,
              role,
              inviter: principal(token).id,
              expires: now() + 3600000,
            });
            changed(org, "invite.create", uid, {});
            return { token: secret, mocked: true };
          }),
        accept: (secret) =>
          invoke(null, "invite.accept", null, () => {
            const actor = principal(token);
            const invite = invites.get(secret);
            if (!invite || invite.uid !== actor.id || invite.expires <= now())
              fail("FORBIDDEN");
            const { org, uid, role } = invite;
            const issuer = memberships.get(`${org}/${invite.inviter}`);
            if (
              (accounts.get(invite.inviter)?.platformOwner !== true &&
                (issuer?.status !== "active" ||
                  issuer.role !== "organisation-admin")) ||
              accounts.get(invite.inviter)?.status !== "active"
            )
              fail("FORBIDDEN");
            if (
              organisations.get(org)?.status !== "active" ||
              memberships.has(`${org}/${uid}`)
            )
              fail("FORBIDDEN");
            memberships.set(`${org}/${uid}`, {
              orgId: org,
              uid,
              role,
              status: "active",
              version: 1,
            });
            invites.delete(secret);
            return changed(org, "invite.accept", uid, { orgId: org });
          }),
      },
      // Platform rights grant configuration only, never implicit tenant content access.
      configure: (org, patch, version) =>
        invoke(org, "configure", org, () => {
          if (!principal(token).platformOwner) fail("FORBIDDEN");
          const row = organisations.get(org);
          if (!row) fail("NOT_FOUND");
          fields(patch, ["modules", "features", "status"]);
          if (
            "modules" in patch &&
            (!Array.isArray(patch.modules) ||
              patch.modules.some((m) => !["tasks", "reporting"].includes(m)) ||
              new Set(patch.modules).size !== patch.modules.length ||
              (patch.modules.includes("reporting") &&
                !patch.modules.includes("tasks")))
          )
            fail("INVALID_INPUT");
          if (
            "features" in patch &&
            (!object(patch.features) ||
              Object.keys(patch.features).some((k) => k !== "reporting") ||
              Object.values(patch.features).some((v) => typeof v !== "boolean"))
          )
            fail("INVALID_INPUT");
          if (
            "status" in patch &&
            !["active", "suspended"].includes(patch.status)
          )
            fail("INVALID_INPUT");
          checkVersion(row, version);
          Object.assign(row, copy(patch), { version: row.version + 1 });
          return changed(org, "configure", org, row);
        }),
    };
  };
  return Object.freeze({
    /** Test-harness bootstrap, deliberately outside the client ports. */
    fakeLogin: async (uid) => {
      if (accounts.get(uid)?.status !== "active") fail("UNAUTHENTICATED");
      const token = crypto.randomUUID();
      sessions.set(token, { uid, expires: now() + 3600000 });
      return client(token);
    },
    anonymous: () => client(null),
  });
}
