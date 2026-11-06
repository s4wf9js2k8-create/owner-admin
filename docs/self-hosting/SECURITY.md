# PostgreSQL/API trust and security boundary

The server is an initial implementation, not a production-security claim. Clients are untrusted. Authentication uses database-backed random sessions, salted scrypt (N=32768,r=8,p=1), bounded passwords (12–128), absolute 12-hour sessions, HttpOnly/Secure/Strict cookies in HTTPS mode, Origin/custom-header CSRF checks, Helmet headers and in-process request/auth rate limits. Unknown users take a dummy scrypt path. Login errors are generic; reset tokens are single-use and 30-minute. Reset revokes every existing session and pending reset for the account. Account suspension invalidates current session use and removes stored sessions; role and tenant/module revocation use current state rather than cached claims.

## Database identity

`channel_migrator` owns schema and runs offline provisioning. `channel_app` is a distinct NOBYPASSRLS/NOSUPERUSER/non-owner runtime role. API startup requires that direct login, no inherited role memberships, and no elevated flags or public object ownership. It rejects role-switched/pooler identities. Every protected transaction sets `app.account_id` locally from a server-verified session and resets it at commit/rollback. SQL callers with runtime credentials are trusted server code: they can set that context. **Do not give application DB credentials to end users** or expose a SQL proxy. RLS is defense in depth against missing tenant predicates, not a defense against theft of the entire API connection identity. No caller-supplied role or company selector becomes authority.

Security-definer helpers read current control tables under fixed search paths; runtime cannot create public-schema functions/tables. Membership/company/account status and module grants determine access. Tenant tables, requests, files, grants, audit events and package controls have RLS. Accounts, sessions and reset tables are API-private identity tables with runtime access, not directly exposed SQL resources. Runtime can read authorized audit rows but has no direct INSERT/UPDATE/DELETE or sequence grant. Database-owned row triggers generate mutation events; narrow validated helpers record read/denial intents. Historical rows are marked legacy, while new rows carry database provenance. Runtime cannot create public-schema functions, and only explicit helper signatures have EXECUTE grants; host/migration operators still can alter the database, so durable external/tamper-resistant audit is future work. Tenant admins see their audit rows, operators see management/audit metadata, and global denied attempts are not exposed to other tenants.

The platform operator manages companies, packages, accounts and memberships. It cannot be assigned a tenant membership through the API and has no implicit record/file read permission. To investigate customer content, it must create a reason-bearing grant for itself (1–60 minutes). Grant creation/revocation and subsequent record/file reads are audited. Grants are read-only, checked against expiry/current company/account state, and cannot enable writes or impersonate a customer. Production support access additionally needs consent/governance, recent MFA and independent review.

## Roles and endpoints

Paths below are relative to `/api`. No endpoint accepts SQL, arbitrary method dispatch, filesystem paths or server credentials.

| Endpoint | Boundary |
| --- | --- |
| POST /auth/login, /auth/recovery, /auth/reset | Bounded schemas; same-origin+CSRF header even before login; rate limited |
| GET /auth/session; POST /auth/logout | Current authenticated account/session |
| GET /companies, /packages | Authorized company projection; active-session package templates |
| POST /owner/accounts; PATCH /owner/accounts/:id | Operator only; no platform role in request; no self-suspension; no owner lifecycle changes |
| POST /owner/companies; PATCH /owner/companies/:cid | Operator only; branding/settings/package/approved overrides/quota/status; expected version on update |
| PATCH /owner/packages/:name | Operator only; expected version, module defaults and nullable draft monthly amount |
| GET /companies/:cid/memberships | Current tenant admin; no account password/email projection |
| PUT /companies/:cid/memberships/:uid | Operator creates membership; tenant admin can edit existing role/status with expected version; no self-change/platform role |
| POST /owner/access-grants; DELETE /owner/access-grants/:id | Operator creates/revokes explicit, expiring read access with reason |
| GET/POST /companies/:cid/records | Current tenant role + module; explicit module filter, limit 1–100 |
| GET/PATCH/DELETE /companies/:cid/records/:id | Tenant/module/role checks, immutable identity, expected version on mutation; manager/admin delete |
| POST/GET /companies/:cid/requests | Tenant admin submits exactly one package/feature; current tenant reads its requests |
| GET /owner/requests; POST /owner/requests/:id/decision | Operator approval/rejection; request and company versions; one pending request per company |
| POST/GET /companies/:cid/files; GET/DELETE /companies/:cid/files/:id | Tenant access; write role upload; tenant admin delete; private downloads |
| GET /owner/storage | Operator-only quotas and aggregate usage, no file contents |
| GET /companies/:cid/audit | Tenant admin, bounded descending history |

Upload body is raw `application/octet-stream`; `X-File-Name` supplies a bounded display name (no slash/backslash/control characters). Generated UUID is the only physical filename. Exact PDF/JPEG/PNG signatures and configured size limits are checked. File metadata includes tenant, uploader, size and SHA-256. Never serve the upload root through nginx/static middleware. Never follow symlinks or accept a stored client path.

Attendance/tasks/general records use one tenant-bound table with explicit module discriminator and shared title/detail/progress/version fields; attendance has validated minutes 0–1440. This is a flexible foundation, not a completed timekeeping/payroll product. It does not yet model timesheets, scheduling, account assignment or statutory calculations.

## Errors and concurrency

JSON errors expose only stable codes such as INVALID_INPUT, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, STORAGE_QUOTA and UNAVAILABLE. No database query, stack, token or password is returned. Failed authenticated requests produce redacted global audit attempts when current account state permits. Anonymous failures are rate limited but do not yet have a durable identity-free security event log. Expected versions and row locks prevent silent overwrites. Current account/session and membership locks protect authorization during mutations; RLS provides independent scope checks. Package approvals lock request and company; upload quota checks serialize against uploads and owner quota changes. Deadlocks/serialization failures return conflict; clients must reload rather than blindly retry a non-idempotent command.

## Launch gates and residual risks

- No live deployment or independent penetration test has happened. Keep synthetic data only until a reviewed release gate.
- Operator MFA, recent authentication, multi-operator recovery, verified invitation delivery, credential rotation, idle session expiry, persistent/distributed rate limits and brute-force alerting need implementation/review.
- No public registration. Operator creates company accounts and assigns membership; initial credentials require a verified private channel. Manual reset-spool delivery is not suitable for unattended commercial recovery.
- No durable outbox/external audit, full cursor pagination, idempotency keys, automatic cleanup/retention, malware scanning, encrypted-at-rest filesystem configuration, tenancy-specific restore/export/deletion, or 24/7 alerting yet.
- Host root/Docker/migration credentials can bypass application isolation. Keep privileged administration separate, patched and monitored. Docker socket access is effectively host administration.
- Test RLS directly for every new table/operation and verify the API never runs as an owner. Adding a public static path to uploads or unrestricted SQL endpoint breaks this boundary.
- The public demo and offline simulation remain explicitly fictional. The historical Firebase preparations are not used, connected or deleted.

See [issue #13 review and patches](SECURITY-REVIEW-13.md) for the focused findings, regression evidence and unchanged production gates.
