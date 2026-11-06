# Draft Firestore schema and permission boundary

Target assumption: a future independently approved **Standard edition, Native mode** Firestore database. No instance was discovered or selected. Edition, region and provisioning remain future decisions. Nothing in this folder is wired into firebase.json, CLI defaults, CI or deployment.

| Path | Required fields and types | Authority |
| --- | --- | --- |
| accounts/{uid} | status: active/suspended, version: positive integer | Identity service only; private account metadata never public |
| organisations/{orgId} | name: string 1–100, status: active/suspended, version: positive integer | Profile edits via tenant admin API; lifecycle via platform API |
| organisations/{orgId}/memberships/{uid} | orgId, uid: path-bound strings, role: viewer/staff/manager/organisation-admin, status: active/revoked, version: positive integer | Membership service; no self-grants or platform roles |
| organisations/{orgId}/entitlements/{moduleId} | orgId, moduleId: path-bound strings, enabled: boolean, version: positive integer | Platform entitlement service; validate module dependencies |
| organisations/{orgId}/modules/{moduleId}/records/{recordId} | id/orgId/module: immutable path-bound strings; title: trimmed string 1–100; detail: string 0–1000; progress: integer 0–100; version: positive integer | Trusted record API validates full post-write schema and expected version |
| organisations/{orgId}/auditEvents/{eventId} | actorUid, orgId, action, target, outcome: bounded strings; occurredAt: server timestamp; requestId: bounded string | Internal atomic outbox only; tenant admin read API |
| organisations/{orgId}/invitations/{id} | recipient binding, token hash, role, orgId, expiry: timestamp, used/revoked state, version | Trusted invitation service only; never return token hash to clients |

UID/org/module/record IDs are bounded to 80 safe characters in the preparation adapter. Unknown fields are denied. Full schemas for service metadata must be finalized before implementation. Account PII must be separated from tenant display projections.

Draft Rules deny **all direct client access**, including valid authenticated tenant users. There are no permitted SDK queries, collection group queries, listeners or writes. The future API must recheck active account, organisation, membership, role and entitlement for every operation. Admin SDK bypasses these Rules: deny-all does not secure an unauthorised server handler.

Record API resolution must resolve record IDs beneath the supplied organisation, never by a global lookup followed by trusting caller fields. Scope lists to `/organisations/{orgId}/modules/{moduleId}/records`, bounded to 100 with future stable cursor pagination. Expected-version comparison, mutation and audit outbox belong in one transaction. Platform eligibility alone grants no tenant content access.

## Prototype attack review

Public/authenticated get/list, cross-tenant access, orphan subcollections, arbitrary collection groups, profile/role grants, direct audit tampering and all create/update/delete variants are denied by the literal false catch-all. Field/type/size/identity/timestamp/replay attacks cannot obtain a direct write grant. There is no create/update validator because **no writes are allowed**, even for an owner. Future API writes require full schema validators independently. The offline service tests cover representative API attacks, not the Rules engine. Rules compilation and emulator request assertions remain required before any policy allows access.
