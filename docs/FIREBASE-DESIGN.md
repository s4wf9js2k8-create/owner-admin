# Future Owner Admin Firebase design — documentation only

Historical preparation: Channel Systems has selected an independent PostgreSQL/Node/Docker backend. This Firebase work is retained for reference and is not used by the new backend. See [self-hosting](self-hosting/README.md).
No Firebase project has been selected, initialized, accessed or connected. There is no Firebase SDK, live config, billing setup or real account here. Issue #8 adds an offline interface and an unwired deny-all prototype Rules file; see [Firebase preparation](FIREBASE-PREPARATION.md). EVLT's live repository, Firebase configuration, credentials, database and hosting must not be accessed or modified as part of this design work. Reusing the EVLT project is an unapproved option requiring a separate security and operational feasibility review. Google quota approval may be needed if separate projects are chosen; this proposal makes no production-security claim.

## Architecture assessment: separate project recommended, decision awaits approval

The [issue #4 decision matrix](TENANCY-DECISION.md) compares shared EVLT Firebase, separate Firebase, managed Supabase/Postgres and a self-hosted API/Postgres option using dated public vendor sources. It recommends keeping EVLT independent and using a separate approved Channel Systems / Owner Admin project. Reuse is technically conditional but **too risky to approve with EVLT's live configuration unassessed**; no inspection is authorized by this issue. Identity Platform user silos do not automatically isolate Firestore, privileged services, recovery or project-level incidents. Billing requirements are sourced; workload costs and project compatibility remain unverified.

A [pure offline authorization model](../proof-of-concepts/tenant-authorization/README.md) tests synthetic tenant A/B record policy, including cross-tenant access, forged identities, revocation and disabled modules. It is separate from the fictional adapter and verifies neither Firebase Rules nor Authentication. See the decision document for exact test coverage, limitations and rollout/rollback gates. The public demo remains fictional and no Firebase configuration or deployment has been added.

## Identity and authorization

For the separate-project option, use Firebase Auth for identity in a newly approved Owner Admin project. A trusted API verifies ID tokens, issuer/audience, expiry and revocation, and looks up account status for every sensitive request. Require verified email, recent reauthentication and enforced MFA for platform admins (including recovery and break-glass procedures). Determine MFA-capable provider/Identity Platform requirements and cost before enabling anything; do not treat a UI checkbox as MFA assurance.

Use small server-issued custom claims for coarse platform eligibility and an authorization-version marker. Only a trusted administrative service may set claims. Claims are cached until token refresh and must not be the sole source of current tenant permissions or suspension state. Authoritative per-organisation memberships contain UID, role, status, allowed actions/modules and version. Tenant membership and organisation status must be checked on every request, including requests with an old token. Do not place a growing list of tenant permissions in claims. Revocation must close active listeners and clear client caches; server checks remain authoritative if a browser ignores cleanup.

Default roles: platform admin for approved management operations; organisation admin for that tenant's delegated administration; manager for assigned workflows; staff/volunteer for approved records; viewer for allowed reads. Organisation admins cannot grant platform roles, change entitlement/billing authority or reactivate themselves. Support access is time-limited, tenant-specific, assigned and audited; no blanket cross-tenant bypass. Platform access also follows least privilege and requires separate, explicit server operations.

## Data paths and least privilege

Proposed Firestore layout:

| Path | Purpose / writer |
| --- | --- |
| `/accounts/{uid}` | Account status and authorization version; trusted service writes |
| `/organisations/{orgId}` | Profile, lifecycle, version; constrained tenant profile edits via API, privileged status changes via platform API |
| `/organisations/{orgId}/memberships/{uid}` | Authoritative tenant membership; validated invitation/role service writes |
| `/organisations/{orgId}/entitlements/{moduleId}` | Enabled module, version and effective dates; platform service writes |
| `/organisations/{orgId}/modules/{moduleId}/records/{recordId}` | Module-specific validated records, immutable tenant/module identity, version |
| `/organisations/{orgId}/supportTickets/{ticketId}` | Tenant/support-assigned access; bounded message subcollection rather than unbounded embedded history |
| `/organisations/{orgId}/auditEvents/{eventId}` | Server timestamp, verified actor, tenant, action, target, request ID, reason and outcome; server-only immutable append |
| `/organisations/{orgId}/invitations/{invitationId}` | Hashed token, normalized recipient binding, role, expiry, used/revoked state; service only |
| `/platformAuditEvents/{eventId}` | Platform provisioning/security events; restricted compliance readers |

Plan a server-mediated write boundary initially. Browser Firestore writes are denied; reads may be scoped direct queries only after emulator rules and identity tests pass. Firestore Rules must default-deny unknown paths and collection-group queries. For every permitted read, verify authentication, active account, active organisation, current membership, allowed action and entitlement. Use path orgId/moduleId, never a client-controlled field as proof. Scope list queries to one tenant/module and enforce bounded limits; rules are not filters. Do not authorize broad reads assuming a client `where` or UI filter supplies isolation.

If direct writes are later proposed, separately review explicit field allowlists, types, sizes, create versus update invariants, immutable orgId/moduleId/owner IDs, valid transitions, and forbidden membership/claim/entitlement changes. Never allow a recursive catch-all rule to override a narrower deny. The subsequent issue #8 preparation adds a draft deny-all Rules file without deployment wiring; direct access remains prohibited.

The Admin SDK bypasses Firestore Rules. Every server handler must enforce the same checks itself, reject forged path/body identities and use narrowly scoped service identities/IAM. Never ship service credentials to the browser. Rate limit privileged operations and exports. Validate all strings and module-specific schemas; React escaping is not input authorization.

## Indexes and query design

Inventory actual queries before provisioning indexes. Candidate composite indexes, all scoped beneath an organisation:

- Records within each module: status + updatedAt descending; assignedUid + status + updatedAt descending where the domain needs it.
- Support tickets: status + updatedAt descending; priority + status + updatedAt descending.
- Audit events: occurredAt descending; actorUid + occurredAt descending; action + occurredAt descending.
- Memberships: status + role for admin directory; invitations: status + expiresAt for cleanup.

Use stable cursor pagination, bounded page sizes and explicit ordering, with index exemptions for large message bodies and sensitive unqueried text. Avoid collection-group access across tenants by default. A platform directory should query a minimal authorized management projection rather than customer records. Version-controlled index definitions, emulator query tests and deployed staging verification are launch gates; these are proposed requirements, not existing indexes.

## Invitations, suspension and deletion

Invitations are created by an authorized tenant admin under permitted role limits. Generate cryptographically random single-use tokens, store only hashes, bind to verified recipient and tenant, apply short expiry, rate limits and revocation. Accept through a trusted service after authentication and recipient verification. Atomically consume the token, create membership and audit; concurrent accepts/replays must not grant twice or elevate roles. Never accept the requested role/org from the invitation URL as authority.

Suspension marks the account or membership inactive, increments its authorization version, revokes refresh tokens as appropriate and blocks every later read/write using the trusted current state, even with previously issued claims. Organisation suspension blocks all tenant customer access while retaining authorized recovery/export paths. Define maximum revocation latency, listener behavior and cache eviction, then verify them under emulator and staging tests.

Deletion is a staged, privileged workflow: recent authentication/MFA, tenant ownership checks, retention/legal-hold decision, export option, access suspension, idempotent recursive purge of subcollections/files/search copies, identity removal if appropriate, and completion evidence. Deleting a parent document does not delete subcollections. Keep only minimal lawful audit metadata; do not copy erased content into logs. Decide retention periods with the data controller before storing any customer data.

## Audit, backup and export

Generate audit data in trusted code with server time and verified identity. Privileged writes and an audit outbox commit atomically; a worker forwards events to access-restricted, tamper-resistant storage with retention and monitoring. Capture denied privileged attempts separately, avoiding secrets and excessive personal information. Browser local activity is not evidence of production actions.

Specify recovery point/time objectives, scheduled managed backups/PITR where supported, separate restricted backup storage and access, retention, deletion handling and restore drills. Verify restoration into an isolated test project, including authentication/claims and configuration that Firestore exports do not restore automatically. Backups are not implemented here.

Tenant exports must be generated by a server-authorized job for one tenant, with schema/version metadata, immutable job identity, short-lived download access, output sanitization and an audit trail. Prevent guessed job IDs or changed org IDs from accessing another tenant's export. Record-count reconciliation and restore/import testing are required. Do not provide cross-tenant exports through browser filtering.

## Separate-project implementation path (conditional, not yet approved)

1. Obtain Google quota approval and explicit authorization for new Owner Admin development/staging/production projects, ownership, region, legal/privacy terms, budget and any billable resources. Never substitute EVLT resources.
2. Provision those separate projects, restricted service identities/IAM, credential management and environment-specific configuration; review any billing/MFA/backup product requirements before activation.
3. Configure Firebase Auth providers, email verification, platform-admin MFA, recovery, token verification/revocation and invitation delivery in the new staging project. This is the earliest point for approved test accounts; none exist now.
4. Implement a remote adapter and trusted API with validated, versioned, idempotent commands, server-owned roles/entitlements, suspension checks and atomic audit outbox. Keep fictional mode explicit and independent.
5. Author and review Firestore Rules and indexes. Execute the full negative emulator suite using synthetic identities locally (emulators can run offline without a real project), then validate deployed behavior and IAM in the new staging project. SDK rules tests alone cannot verify Admin SDK authorization.
6. Configure and rehearse backups, restore, tenant exports, deletion, incident response, monitoring and cost controls in the new projects. Complete independent security/privacy review and test revocation/concurrency end to end.
7. Only after those gates and explicit launch approval, configure production hosting/domains, create approved actual accounts and import approved customer data. GitHub Pages remains a public fictional demo until a separate deployment decision is made.

This issue authorizes preparation only. Every live-project action above remains future work.
