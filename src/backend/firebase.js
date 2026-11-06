/** Firebase integration preparation, OFFLINE ONLY. No SDK initialization or IO.
 * Transport injection is a trusted composition boundary, never caller input.
 * The production demo never imports this module.
 */
import { BackendError } from "./offline.js";
const fail = (code) => {
  throw new BackendError(code);
};
const id = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const clone = (value) => structuredClone(value);
const knownErrors = new Set([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "CONFLICT",
  "UNAVAILABLE",
]);
const codes = {
  "auth/user-token-expired": "UNAUTHENTICATED",
  "auth/network-request-failed": "UNAVAILABLE",
  "permission-denied": "FORBIDDEN",
  "not-found": "NOT_FOUND",
  "invalid-argument": "INVALID_INPUT",
  aborted: "CONFLICT",
  unavailable: "UNAVAILABLE",
};

/** Reject real project identifiers until a separately approved SDK integration exists. */
export function firebasePreparationConfig(env = {}) {
  const projectId = env.CHANNEL_FIREBASE_PROJECT_ID ?? "demo-channel-systems";
  if (
    !/^demo-channel-systems(?:-[a-z0-9-]+)?$/.test(projectId) ||
    (env.CHANNEL_FIREBASE_MODE ?? "offline") !== "offline"
  )
    fail("INVALID_INPUT");
  return Object.freeze({ projectId, mode: "offline" });
}

/** Same async auth/record signatures as the offline service, no demo snapshot API.
 * A future verified API transport must independently authorize EVERY command.
 */
export function createFirebaseAdapter({
  config = firebasePreparationConfig(),
  transport,
} = {}) {
  const safeConfig = firebasePreparationConfig({
    CHANNEL_FIREBASE_PROJECT_ID: config.projectId,
    CHANNEL_FIREBASE_MODE: config.mode,
  });
  if (
    transport?.kind !== "offline-firebase-transport" ||
    typeof transport.execute !== "function"
  )
    fail("INVALID_INPUT");
  const call = async (operation, orgId, args = []) => {
    try {
      if (orgId !== null && !id(orgId)) fail("INVALID_INPUT");
      // Copy before await so later caller changes cannot change the command.
      return clone(
        await transport.execute(
          clone({ operation, orgId, args, projectId: safeConfig.projectId }),
        ),
      );
    } catch (error) {
      throw new BackendError(
        knownErrors.has(error?.code)
          ? error.code
          : (codes[error?.code] ?? "UNAVAILABLE"),
      );
    }
  };
  const recordId = (value) => {
    if (!id(value)) fail("INVALID_INPUT");
  };
  const validate = (data, creating) => {
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      !Object.keys(data).length ||
      Object.keys(data).some(
        (k) =>
          ![
            "title",
            "detail",
            "progress",
            ...(creating ? ["module"] : []),
          ].includes(k),
      )
    )
      fail("INVALID_INPUT");
    if (
      (creating || "title" in data) &&
      (typeof data.title !== "string" ||
        !data.title.trim() ||
        data.title.length > 100)
    )
      fail("INVALID_INPUT");
    if (creating && !id(data.module)) fail("INVALID_INPUT");
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
  const version = (value) => {
    if (!Number.isInteger(value) || value < 1) fail("INVALID_INPUT");
  };
  return Object.freeze({
    kind: "firebase-preparation-offline",
    config: safeConfig,
    auth: Object.freeze({
      getSession: () => call("auth.getSession", null),
      logout: () => call("auth.logout", null),
    }),
    records: Object.freeze({
      list: async (org, module, limit = 100) => {
        if (!id(module) || !Number.isInteger(limit) || limit < 1 || limit > 100)
          fail("INVALID_INPUT");
        return call("records.list", org, [module, limit]);
      },
      get: async (org, record) => {
        recordId(record);
        return call("records.get", org, [record]);
      },
      create: async (org, values) => {
        validate(values, true);
        return call("records.create", org, [values]);
      },
      update: async (org, record, patch, expectedVersion) => {
        recordId(record);
        validate(patch, false);
        version(expectedVersion);
        return call("records.update", org, [record, patch, expectedVersion]);
      },
      delete: async (org, record, expectedVersion) => {
        recordId(record);
        version(expectedVersion);
        return call("records.delete", org, [record, expectedVersion]);
      },
    }),
  });
}

/** Synthetic transport exercises the real offline authorization boundary.
 * No credentials, tokens, role claims, network endpoint or SDK accepted here.
 */
export function createOfflineFirebaseTransport(client) {
  const operations = new Map([
    ["auth.getSession", () => client.auth.getSession()],
    ["auth.logout", () => client.auth.logout()],
    ...["list", "get", "create", "update", "delete"].map((method) => [
      `records.${method}`,
      (command) => client.records[method](command.orgId, ...command.args),
    ]),
  ]);
  return Object.freeze({
    kind: "offline-firebase-transport",
    execute: async (command) => {
      if (!operations.has(command.operation)) fail("FORBIDDEN");
      return operations.get(command.operation)(command);
    },
  });
}
