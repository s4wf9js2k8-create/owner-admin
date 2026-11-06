# Reproducible tests and precise limits

Run from repository root:

```sh
npm ci
npm ci --prefix server
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

`test:integration` requires a local Linux Docker socket and the official `postgres:17-alpine` image (pulled automatically by Docker if absent). It creates a disposable container with random in-memory test passwords and an ephemeral loopback-only PostgreSQL port, applies migrations twice, provisions a non-owner/NOBYPASSRLS role and runs Supertest HTTP requests against the real API. It never uses the Compose installation, a real customer, an existing database URL, Firebase or EVLT. Cleanup removes that container and its temporary files. On Windows, run these integration checks inside WSL/Linux; native Windows Docker endpoint handling is not currently covered by this test harness.

The nine integration groups cover:

1. scrypt salts/verification, valid/invalid sign-in, no-session access, CSRF, forged fields, malformed IDs and bounded queries.
2. Record CRUD, concurrent expected-version conflicts, cross-tenant get/list/update/delete in API calls, direct SQL read/insert denial, no-context denial and role-specific deletion.
3. Operator/tenant-role separation, self-role/platform escalation, viewer write denial, existing-session membership revocation and company suspension/reactivation.
4. Package/feature requests, operator-only approval, stale/replayed decisions, disabled-module retention and restored access after explicit feature approval.
5. Platform customer records denied by default, explicit reason-bearing read grant, audited use, write denial and revocation.
6. File signatures, traversal, size/quota denial, tenant/owner download denial, attachment headers, storage summary and symlink refusal.
7. Account suspension, generic recovery replies, private token delivery, single-use reset, session revocation and logout.
8. Migration checksums/idempotency, role flags, audit mutation denial, real pg_dump/pg_restore into a separate disposable database, RLS/schema history restoration and file archive roundtrip.
9. Expired sessions/grants and concurrent uploads that cannot overrun a company quota.

The frontend unit tests verify explicit same-origin requests, cookies, CSRF and version semantics without fictional fallback. Browser tests preserve every earlier workflow, responsive viewport and keyboard check and exercise unavailable-backend handling and authenticated operator storage projections. Browser route mocks are labelled tests of frontend behavior, not proof of PostgreSQL security.

## Packaged Docker rehearsal

For a **new empty disposable** Compose installation only, after building/starting it using the installation instructions:

```sh
CONFIRM_CHANNEL_COMPOSE_TEST=disposable-synthetic-instance npm run test:compose
```

This acknowledgement is mandatory. The script targets localhost:3000 and the current Compose project; never run it against a retained installation. It bootstraps a synthetic operator with a randomly generated password held only in process memory, creates a company/admin, writes a record/PDF, runs the real backup script, edits data, runs the real restore script, verifies the earlier record and exact file bytes, proves restored sessions are invalid, then launches Chromium against the bundled Docker frontend and verifies the operator storage dashboard through the real API. Existing operator bootstrap blocks accidental reuse of an established installation. It leaves the disposable synthetic Compose data for inspection; explicitly remove only that test instance afterwards. `CHROMIUM_PATH` may select an installed browser; default is /usr/bin/chromium. Linux/WSL and root npm dev dependencies are required.

GitHub CI adds a separate PostgreSQL integration job; it does not deploy or auto-merge. Compose recovery rehearsal is a separate local check so existing CI need not own persistent Docker volumes or a browser-enabled server installation.

## Limits

These checks establish behavior under local synthetic tests, not production readiness, Windows host verification, sustained load/resilience, internet exposure, secure certificate/IAM/host configuration or real disaster recovery. There has been no independent penetration test. See the security launch gates. Software dependencies/images must be patched, pinned/reviewed for a release and tested against the intended host before commercial use.

## Recorded local result — 6 November 2026

- `npm run lint`: passed.
- `npm test`: **52 passed** (existing model/policy/offline/Firebase-preparation tests plus PostgreSQL client contract checks).
- `npm run test:integration`: **9 integration groups passed**, including direct SQL cross-tenant select/insert/update/delete denial, direct staff-role escalation denial, immutable record identity, migration checksums, actual PostgreSQL dump/restore, filesystem archive recovery and quota races.
- `npm run build`: passed.
- `npm run test:e2e`: **51 Chromium cases passed** across desktop, phone and tablet.
- Alpine Node/PostgreSQL Docker image build and Compose migration/startup/health: passed locally.
- `npm run test:compose` with the explicit disposable-instance acknowledgement: passed actual packaged API → PostgreSQL/files → backup scripts → restore scripts → session revocation → Chromium operator storage dashboard.
- `server/scripts/monitor.sh`: passed against the disposable local instance.
- `git diff --check`: passed.

No live server, real customer information, EVLT, Firebase, paid provider or production deployment was used. The Windows host path was not executed. CI runs are separate evidence from these local results.
