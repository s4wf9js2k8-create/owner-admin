// Invented A/B identities only; deliberately independent from demo fixtures.
import { membershipKey, moduleKey, recordKey } from "./policy.js";
export function syntheticContext(uid = "alice") {
  return {
    principal: uid === null ? null : { uid },
    accounts: new Map(
      ["alice", "bob", "reader", "admin"].map((id) => [
        id,
        { status: "active" },
      ]),
    ),
    organisations: new Map(
      ["tenant-a", "tenant-b"].map((id) => [id, { status: "active" }]),
    ),
    memberships: new Map([
      [
        membershipKey("tenant-a", "alice"),
        { uid: "alice", orgId: "tenant-a", status: "active", role: "member" },
      ],
      [
        membershipKey("tenant-b", "bob"),
        { uid: "bob", orgId: "tenant-b", status: "active", role: "member" },
      ],
      [
        membershipKey("tenant-a", "reader"),
        { uid: "reader", orgId: "tenant-a", status: "active", role: "viewer" },
      ],
      [
        membershipKey("tenant-a", "admin"),
        {
          uid: "admin",
          orgId: "tenant-a",
          status: "active",
          role: "organisation-admin",
        },
      ],
    ]),
    entitlements: new Map(
      ["tenant-a", "tenant-b"].map((orgId) => [
        moduleKey(orgId, "tasks"),
        { orgId, moduleId: "tasks", enabled: true },
      ]),
    ),
    records: new Map(
      ["tenant-a", "tenant-b"].map((orgId) => [
        recordKey(orgId, "tasks", "record-1"),
        {
          orgId,
          moduleId: "tasks",
          id: "record-1",
          title: "Synthetic task",
          detail: "Invented fixture",
          status: "Planned",
        },
      ]),
    ),
  };
}
