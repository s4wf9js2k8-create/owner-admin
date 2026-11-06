# Offline backend foundation — issue #6

`src/backend/offline.js` exports `createOfflineBackend()`. It owns disposable state in a closure and makes no IO calls. All identities and organisations are synthetic. It neither imports nor replaces the public fictional dashboard adapter. No live service, authentication, database, hosting or EVLT resource is involved.

## Running the foundation

```js
import { createOfflineBackend } from './src/backend/offline.js';
const harness = createOfflineBackend();
const alice = await harness.fakeLogin('alice'); // MOCK ONLY, no password/auth verification
const record = await alice.records.create('alpha', {
  module: 'tasks', title: 'Synthetic task',
});
await alice.records.update('alpha', record.id, { progress: 100 }, record.version);
const bob = await harness.fakeLogin('bob');
await bob.records.get('alpha', record.id); // rejects FORBIDDEN
```

The factory and fakeLogin are trusted test harness bootstrap, never public API routes. Available fake users: alice (alpha admin), bob (beta admin), viewer and staff (alpha), guest (no membership), owner (configuration only). Owner has no implicit tenant record access. Login sessions expire after one hour and can be logged out. The optional `now` clock is for deterministic expiry testing.

## Ports and security semantics

The resource port names and asynchronous method shapes follow the existing backend boundary, with explicit security-oriented extensions. This service intentionally **does not satisfy `assertBackend`**, whose reset, unrestricted fixture snapshot, bulk replacements, client audit append and demo settings are unsafe protected-service contracts. Do not wire the public UI to a real database through that demo interface.

- `auth.getSession/logout`: mocked identity metadata and session invalidation.
- `organisations.list/update`: active member directory only; admin name change with expected version.
- `memberships.list/update`: tenant admin only; validated roles/status, expected version, no self-change or platform grants.
- `entitlements.list`: authorized configuration projection.
- `configure(orgId, patch, expectedVersion)`: fake platform owner only; modules, reporting feature flag and organisation lifecycle. Reporting module depends on tasks. Features are configuration metadata; no reporting endpoint exists yet.
- `records.list/get/create/update/delete`: tenant, current account, organisation, membership, role and module checks on every call. Caller-supplied identity fields are rejected. Title/detail/progress use field allowlists and bounds. Lists are tenant/module scoped and bounded to 100, with no broad read port.
- `invitations.create/accept`: admin-issued, one-hour, recipient-bound, single-use fake invitations. Acceptance rechecks issuer authority and organisation state; role and tenant come from internal state.
- `auditEvents.list`: tenant admin only; no append/update/delete exposed. Successful writes generate actor/time/target/outcome internally; rejected calls generate redacted events. Global/unknown-scope failures remain internal and cannot be listed by a tenant. Logs omit invitation secrets and record contents.

Staff can read/create/edit, managers can also delete, viewers read only, organisation admins additionally manage members/profile/invites. All returned values are detached copies. Each command runs synchronously before its Promise resolves; validation, current authority, version comparison, mutation and success event happen in one in-process turn. Competing stale writes return CONFLICT. BackendError codes are UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_INPUT and CONFLICT. Cross-tenant and nonexistent record IDs inside an authorized tenant both return NOT_FOUND.

## Verification and limitations

Run `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`. The offline unit integration matrix tests cross-tenant ports, forged authority/fields, role grants, revocation, disabled modules, suspension, session/invite expiry, single-use invitations, version races, detached data and audit behavior. Browser tests exercise this service in Chromium on desktop, phone and tablet; existing workflow tests protect the unchanged demo.

This is a functional offline service model, not production security. A browser visitor can modify their runtime. There is no durable storage, cryptographic authentication, distributed transaction, persistent audit, request throttling, pagination, account lifecycle management, invitation delivery/revocation UI, support API or protected workspace UI. Invitations are opaque in-memory handles, not durable hashed tokens. Fake bootstrap can impersonate any fixture identity and must never ship as an authentication endpoint. In-memory records/logs grow until the harness is discarded; never expose this to untrusted traffic. Account status is checked but account suspension administration is deferred.

## Future integration and deployment checklist

1. Obtain separate approval for independently provisioned Channel Systems staging and budget; keep EVLT completely separate. No infrastructure is approved by this implementation.
2. Replace fakeLogin with verified issuer/audience/identity-realm-bound identity, expiry/revocation enforcement, MFA for privileged operations and secure transport/session handling.
3. Implement tenant-scoped queries and storage constraints: independent Firebase project with deny-default Rules and trusted handlers, or PostgreSQL composite tenant keys, foreign keys and RLS with non-bypass application roles. Never download all tenants to filter in the browser.
4. Move authorization, expected-version checks, membership/config changes and audit outbox into storage transactions. Add idempotency keys, persistent hashed invitation tokens, revocation and rate limits. Preserve these port/error semantics rather than exposing storage SDKs to UI consumers.
5. Build separate authorized owner/tenant projections and cache clearing on logout/revocation. Do not implement a universal fixture snapshot remotely. Add bounded pagination, listener revocation, cancellation and retry rules.
6. Run negative Rules/RLS and trusted API tests against independent synthetic staging, including concurrent permission changes, account suspension, exports, support access and backup restore. Offline tests cannot establish these properties.
7. Review region/residency, retention, audit storage, least privilege, observability, recovery and incident ownership. Require security review and rollback rehearsal before any real data, deployment or live authentication.
