# Threat model and security test plan

## Scope, assets and trust boundaries

Current scope is a public, fictional, session-only demonstration. Any visitor can inspect and alter all browser code and fixtures. No real authentication, tenant isolation, durable audit, Firebase Rules, secrets or production backend exists. Demo scoping tests are correctness checks, not proof of security.

Future assets: tenant operational/personal records, memberships, entitlements, support messages, invitation tokens, audit events, exports, backups and platform privileges. Adversaries include anonymous visitors, malicious tenant members/admins, revoked accounts, compromised support/platform accounts and concurrent/replayed requests. Boundaries are browser → verified API → database/Rules, privileged services → Admin SDK/IAM, and export/backup storage → authorized recipient. The browser, its selected org ID, local role labels and feature flags are untrusted.

## Threats, controls and executable test cases required before launch

Use two unrelated synthetic tenants A/B, multiple roles, inactive accounts/memberships, and enabled/disabled modules. Exercise raw SDK/HTTP requests, including requests the UI never exposes. Run each read case for get, list/query, listener, pagination and export where applicable; each write case for create, update, delete, batch and transaction.

| Threat | Required control | Required positive and negative checks |
| --- | --- | --- |
| Cross-tenant reads/writes | Server authority from active membership and path; scoped Rules | A member reads/edits allowed A record; same actor cannot get/query/listen/create/update/delete B records, memberships, tickets or audit events. No broad collection/group queries or leaks through counts/errors. |
| Forged org IDs and IDOR | Bind route, stored identity and verified membership; opaque IDs are not authorization | Swap route/body orgId, recordId, ticketId, export job ID and cursor; try valid B IDs and guessed/nonexistent IDs. Assert no B data or side effects, including nested subcollections. |
| Privilege escalation | Server-owned roles/claims/entitlements, role-grant limits | Viewer cannot mutate; tenant admin cannot self-grant platform role, change own membership authority, assign forbidden roles, edit claims, prices, audit or entitlements. Forged body actor/role is ignored/rejected. Admin SDK handler tests must prove this separately from Rules. |
| Disabled modules | Check current server entitlement for reads and writes | Allowed module operation succeeds; disable module while a tab/listener is open, then direct requests and stale-token operations fail. Attempts to change record module/path or use Reporting to aggregate disabled data fail. Retained records are inaccessible. |
| Revoked or suspended users/tenants | Active account/membership/org check, revocation/version policy | Revoke membership or suspend user/org with a previously valid token; reads, listeners, writes, exports and invitation acceptance fail within the specified bound. Cached claims cannot re-enable access; removing a UI option is insufficient. |
| Unauthenticated access | Default deny and verified identity | Missing, malformed, expired, wrong-project and revoked tokens cannot read or write any protected endpoint/path, including platform directory. Valid minimal role can access only its explicit scope. |
| Concurrent updates/replays | Expected versions, transactions, idempotency | Race two role changes, module dependency edits, record updates and invite accepts. Exactly one stale-version update succeeds; conflict leaves no partial state. Retry provisioning/export commands with the same key: one effect and one audit outcome; different key cannot bypass permissions. |
| Invitation abuse | Hashed single-use token, recipient/tenant binding and expiry | Wrong email, changed tenant/role, expired/revoked token, reuse, double accept and rate-limit attempts fail; authorized acceptance creates only the intended membership atomically. |
| Audit tampering | Server-only immutable events and restricted readers | Client create/update/delete of events fails; successful privileged mutation yields verified actor/time/target/outcome; denied request is recorded without secret payload. Crash/retry between write and audit cannot silently lose or duplicate event. |
| Support overreach | Explicit assigned tenant/time scope, redaction | Assigned support action succeeds; unassigned/expired access and attempts to traverse another ticket's history fail. Platform eligibility alone does not expose all customer content. |
| Data loss/export leakage | Scoped jobs, short-lived downloads, backup IAM, deletion workflow | A export reconciles to A only; B cannot poll/download A job; expired links fail; restore drill meets objectives; delete removes subcollections/copies and obeys legal hold without resurrecting access from backup. |
| Injection/resource exhaustion | Field allowlists, types, size/query limits and rate limits | Unknown fields, changed immutable IDs, oversized strings/arrays, invalid states, malicious markup and excessive queries fail safely; errors/logs omit tokens and personal content. |

## Negative Firestore Rules suite — future, not yet implemented

Use `@firebase/rules-unit-testing` and a local emulator with synthetic identities only. Start from deny-all; clear data between cases and seed via emulator admin context. For every allowed action, add unauthenticated, wrong-tenant, wrong-role, inactive membership/account/org and disabled-module variants using `assertFails`; add intended access using `assertSucceeds`. Test missing documents/fields, malformed claim types, absent roles, forged orgId/UID/module fields, unknown paths, recursive subcollections and collection-group queries. Prove create/update/delete distinctions and ensure no broad recursive allow overrides denies. If browser writes stay denied, explicitly assert all client writes fail, including legitimate users; server API tests cover allowed writes.

Verify query constraints and pagination against real intended indexes; include bounded/unbounded list queries and listeners. Rules cannot authorize Admin SDK calls: test trusted handlers independently with mocked verified identities and staging integration requests, including every negative matrix row. Add concurrency tests using separate clients and stale versions, not sequential calls to one in-memory store.

Emulator tests are a launch gate, not included as passing claims in this PR: no Firebase integration or deployable Rules exists yet. A local offline emulator can be introduced without a live project after the remote design is approved; deployed Rules/IAM/Auth/revocation tests require the separate new Owner Admin staging project.

## Verification layers and residual risk

- Current unit suite: model invariants, all adapter ports, immutable/copy semantics, fictional IDs, scoped mutations, detached fixtures/reset, bounded local events, in-process concurrent creates, load errors and subscriptions.
- Current browser suite: existing organisation/module/subscription/support/customer workflows; injected delayed/failed/empty adapters and failed mutations; explicit reset; keyboard focus trap/Escape; desktop, phone and tablet layouts.
- Build/CI: lint, unit tests, production GitHub Pages build and Chromium tests. These checks do not establish production security or Safari compatibility.
- Future launch gate: negative Rules and trusted-handler suites, two-tenant staging verification, MFA/revocation, rate limits, distributed conflicts, backup restore/export/deletion exercises and independent security review.

Residual risks today: every fictional fixture is public, browser activity can be edited, demo role/module checks can be bypassed, writes are not durable or distributed, and no real access-control mechanism exists. Do not import real data or advertise secure tenancy based on this demo. See [project prerequisites](FIREBASE-DESIGN.md#separate-project-implementation-path-conditional-not-yet-approved).

## Offline proof of concept (issue #4)

The [pure synthetic policy suite](../proof-of-concepts/tenant-authorization/README.md) now implements 14 named policy cases for the record boundary: A/B reads/writes/lists, forged org/module/record IDs and roles, revoked membership, disabled modules, unauthenticated/suspended access, role limits, default deny and field validation. These are JavaScript model checks, **not negative Firestore Rules tests**. The Rules, real Auth, privileged API/IAM, concurrency, audit, recovery and rollout gates above remain unverified. See [TENANCY-DECISION.md](TENANCY-DECISION.md) for sourced architecture tradeoffs and the current recommendation to keep EVLT independent.

## Offline service coverage (issue #6)

The [offline foundation](OFFLINE-BACKEND.md) adds executable service-level negative tests for tenant scope across resource ports, role escalation, revocation, modules, stale writes, invitations and audit behavior. This advances the earlier pure policy model to disposable resource operations. It does not verify HTTP authentication, Rules/RLS, IAM, durable audit, distributed races or production deployment. The existing production launch gates remain required.
