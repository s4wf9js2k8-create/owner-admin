# Dedicated Channel Systems Firebase preparation — issue #8

Historical preparation: Channel Systems has selected an independent PostgreSQL/Node/Docker backend. This Firebase work is retained for reference and is not used by the new backend. See [self-hosting](self-hosting/README.md).
Status: offline interface and prototype policy only. No SDK, live project, app registration, credentials, authentication provider, deployment or paid service has been added. EVLT is untouched. The unchanged public demo still uses `fictional.js`; its production import graph contains neither the offline service nor the Firebase preparation module.

## Use and contracts

```js
import { createOfflineBackend } from '../src/backend/offline.js';
import {
  firebasePreparationConfig, createFirebaseAdapter, createOfflineFirebaseTransport,
} from '../src/backend/firebase.js';
const harness = createOfflineBackend();
const adapter = createFirebaseAdapter({
  config: firebasePreparationConfig({ CHANNEL_FIREBASE_MODE: 'offline' }),
  transport: createOfflineFirebaseTransport(await harness.fakeLogin('alice')),
});
await adapter.auth.getSession(); // { uid: 'alice', mocked: true }
await adapter.records.create('alpha', { module: 'tasks', title: 'Synthetic task' });
```

`auth.getSession/logout` and `records.list/get/create/update/delete` preserve the offline service's asynchronous signatures, return values and expected-version semantics. This is a focused **interface**, not a functioning Firebase SDK adapter. It cannot be substituted for the dashboard's unrestricted demo `Backend` contract. Authentication is mocked; no login form, password, ID token or production auth implementation exists here.

`firebasePreparationConfig(env)` accepts explicit environment values; it does not read process/browser globals or initialise SDKs. Only offline mode and `demo-channel-systems` (optionally suffixed) IDs are accepted. The factory fails closed without an explicitly injected offline transport. There is no environment auto-selection, network fallback or production enable flag. Passing a real project ID requires future implementation work, not a configuration toggle.

The injected transport is a **trusted composition boundary**, not a security sandbox for arbitrary JavaScript. A future transport must independently verify identity and authorize each command on a trusted server. Never accept transport implementations from a request. `createOfflineFirebaseTransport(client)` dispatches only explicit auth/record operations to the existing closure-owned service. It does not accept arbitrary method paths, roles, credentials, URLs or identity claims.

Input validation rejects malformed path IDs, forged identity/role fields, extra fields, invalid title/detail/progress, unbounded lists and invalid expected versions. Commands and results are copied. Errors map to redacted UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_INPUT, CONFLICT or UNAVAILABLE; raw provider messages are not returned. These checks supplement, and cannot replace, server-side authorization and validation.

## Collections and permission boundaries

See [draft schema and attack review](../firebase/draft/schema.md) and [prototype firestore.rules](../firebase/draft/firestore.rules). The planned structure matches the earlier design: accounts, organisation profiles, tenant memberships and entitlements, module-scoped records, invitations and immutable audit events.

Prototype Rules deny every direct client read/write, including authenticated tenant users and platform owners. All future writes initially go through a separately authorized API. No partial allow policy is included. Admin SDK bypasses Rules and therefore needs independent current-state checks, validation, version transactions and least-privilege IAM. Neither a custom claim nor a caller-selected org ID grants authority. Platform configuration rights do not imply tenant content access.

No `firebase.json`, `.firebaserc`, app configuration, index deployment or Firebase CI command is installed. The existing GitHub Pages build/deploy path is unchanged. The draft cannot be accidentally selected by the current deployment workflow.

## Verification and precise limits

`npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` run the existing compatibility checks plus preparation tests. New tests cover both directions of cross-tenant CRUD/list denial; current revocation and disabled modules; anonymous/viewer denial; validation before transport; expected-version conflicts; safe error mapping; detached commands and results; unknown operation rejection; and a Chromium synthetic adapter flow across desktop/phone/tablet.

A static regression test locks the Rules file to the literal deny-all grammar. This is **not a Firebase Rules compiler, emulator test or proof of production isolation**. Negative authorization tests execute the offline service behind the interface. No SDK, Rules engine, token cryptography, index/query behavior or deployed IAM has been exercised. Before any Rules allowance or live use, compile and execute the prototype against the official emulator with synthetic users, then run negative API and deployed staging tests. The preparation does not claim emulator validation.

## Separate project setup — future approval and implementation required

1. Approve independently owned Channel Systems development/staging/production resources, identity model, Standard edition/Native mode versus alternatives, region, legal responsibilities, quota and budget. **Never select EVLT as a fallback.** Do not create resources or enable billing under this issue.
2. After approval, create separate projects and configure narrowly scoped service identities. Confirm project ID, database edition/location and allowed identity issuer/audience before registering a web app. Keep staging and production config separate; do not reuse credentials or project aliases from another product.
3. Use [environment.example](../firebase/draft/environment.example) as a variable inventory. Currently only CHANNEL_FIREBASE_MODE and CHANNEL_FIREBASE_PROJECT_ID are read via explicit arguments. Future public web config variables: CHANNEL_FIREBASE_AUTH_DOMAIN, CHANNEL_FIREBASE_API_KEY and CHANNEL_FIREBASE_APP_ID. These are not admin credentials, but still must come from the independently approved project. Never put server credentials in VITE_* variables or browser bundles. Future server identity should use workload identity or a server-only GOOGLE_APPLICATION_CREDENTIALS path managed outside git.
4. Add a separately reviewed SDK/API transport and explicit composition entry point; remove the preparation-only demo-ID restriction only in that reviewed implementation. Select emulator mode explicitly using future CHANNEL_FIREBASE_AUTH_EMULATOR_URL and CHANNEL_FIREBASE_FIRESTORE_EMULATOR_HOST, restricted to loopback and a synthetic demo project. Never fall back from an unavailable emulator to live services. Do not connect the public Pages demonstration.
5. Before live provider activation, implement verified Auth tokens, issuer/audience/realm binding, revocation, current account state, email verification and privileged MFA/recent authentication. Configure providers, test recipients and recovery only in the new approved staging project. FakeLogin must never become a public auth endpoint.
6. Implement storage schemas, tenant-bound lookups and bounded queries; full post-write validation; transaction-safe membership/module checks, version comparisons and audit outbox; idempotency; rate limiting; secure hashed invitations. Add Firebase SDK/emulator dependencies only when this implementation is authorized and review package versions. The present interface requires no Firebase packages or network access.
7. Compile Rules locally and test anonymous, valid A/B, wrong-issuer, revoked/suspended, viewer, platform/support and disabled-module cases; exercise get/query/listener/create/update/delete, nested paths, collection groups, field pollution, oversized inputs and replay. Direct SDK access must remain denied until explicitly reviewed. Add required indexes from actual queries, not speculative production indexes.
8. Review API/IAM bypass boundaries, tenant projections and cache eviction, monitoring, retention, backups, restore, export/deletion, costs and rollback. Rehearse synthetic staging before any real user data or production deployment; retain the offline demo as an independent mode.

## Remaining work

Actual Firebase transport, official emulator suite, token verification and live auth, persistence and distributed transactions, indexes, rate limiting, durable audit and operational recovery remain unimplemented. Refer to [the architecture decision](TENANCY-DECISION.md), [threat model](THREAT-MODEL.md), and [offline service](OFFLINE-BACKEND.md) for unchanged launch gates.
